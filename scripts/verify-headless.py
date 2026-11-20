#!/usr/bin/env python3
"""Run the configured headless command twice and validate deterministic JSONL."""

import argparse
import json
import subprocess
from pathlib import Path
from tempfile import TemporaryDirectory


ROOT = Path(__file__).resolve().parents[1]


def _require(record, keys, label):
    missing = [key for key in keys if key not in record]
    if missing:
        raise ValueError(f"{label} is missing fields: {', '.join(missing)}.")


def validate_v12(records):
    snapshots = [record for record in records if record.get("type") == "snapshot"]
    for snapshot in snapshots:
        _require(snapshot, ("sim_tick", "night", "state", "player", "lanterns"), "Snapshot")
        player = snapshot["player"]
        if not isinstance(player, dict):
            raise ValueError("snapshot.player must be an object.")
        _require(player, ("capacity", "carried", "flames"), "snapshot.player")
        if type(player["capacity"]) is not int or not 10 <= player["capacity"] <= 20:
            raise ValueError("snapshot.player.capacity must be an integer in [10, 20].")
        if not isinstance(snapshot["lanterns"], list):
            raise ValueError("snapshot.lanterns must be an array.")
        for lantern in snapshot["lanterns"]:
            _require(
                lantern,
                ("id", "lit", "deposited", "fuel", "ever_lit", "relit_count"),
                "snapshot lantern",
            )
            if not isinstance(lantern["fuel"], (int, float)) or not 0 <= lantern["fuel"] <= 100:
                raise ValueError("snapshot lantern fuel must be in [0, 100].")
            if lantern["lit"] is False and lantern["fuel"] != 0:
                raise ValueError("An unlit snapshot lantern must have fuel 0.")

    for event in (record for record in records if record.get("type") == "event"):
        name, data = event.get("name"), event.get("data")
        if not isinstance(data, dict):
            raise ValueError(f"Event {name!r} must contain an object payload.")
        if name == "refuel":
            _require(data, ("lantern_id", "amount", "fuel"), "refuel event")
        elif name == "lantern_out":
            _require(data, ("lantern_id",), "lantern_out event")
        elif name == "fuel_drain":
            _require(data, ("lantern_id", "shade_id", "fuel"), "fuel_drain event")
        elif name == "lantern_lit":
            _require(data, ("lantern_id", "relight"), "lantern_lit event")
        elif name == "game_over" and data.get("result") == "won":
            if data.get("reason") != "dawn_survived":
                raise ValueError("Contract v1.2 wins must use reason dawn_survived.")


def validate_output(output, ticks, contract):
    records = [json.loads(line.decode("utf-8")) for line in output.splitlines()]
    if not records or any(not isinstance(record, dict) for record in records):
        raise ValueError("Expected JSONL made up of JSON objects.")

    first, last = records[0], records[-1]
    first_tick = first.get("tick")
    if first.get("type") != "snapshot" or type(first_tick) is not int or first_tick != 0:
        raise ValueError("The first record must be the tick-0 snapshot.")
    if last.get("type") != "end" or any(
        record.get("type") not in ("snapshot", "event") for record in records[:-1]
    ):
        raise ValueError("Expected snapshots and events followed by one end record.")

    end_ticks = last.get("ticks")
    if type(end_ticks) is not int or not 0 <= end_ticks <= ticks:
        raise ValueError("The end record has an invalid tick count.")
    state = last.get("state")
    if state not in ("playing", "won", "lost"):
        raise ValueError("The end record has an invalid game state.")
    if state == "playing" and end_ticks != ticks:
        raise ValueError("The simulation stopped before the requested tick count.")
    if contract.get("contract_version") == "1.2":
        validate_v12(records)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--out", type=Path, required=True, help="Evidence JSONL path")
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--night", type=int, default=1, choices=[1, 2, 3])
    parser.add_argument("--ticks", type=int, default=120)
    parser.add_argument("--snapshot-every", type=int, default=10)
    parser.add_argument("--scenario", type=Path)
    parser.add_argument("--inputs", type=Path)
    args = parser.parse_args()
    if args.ticks < 0 or args.snapshot_every < 1:
        parser.error("--ticks must be nonnegative and --snapshot-every must be positive.")

    flags = [
        "--seed", str(args.seed), "--night", str(args.night), "--ticks", str(args.ticks),
        "--snapshot-every", str(args.snapshot_every),
    ]
    for flag, path in (("--scenario", args.scenario), ("--inputs", args.inputs)):
        if path is not None:
            flags.extend([flag, str(path.resolve())])

    try:
        contract = json.loads((ROOT / "game.contract.json").read_text(encoding="utf-8"))
        if not isinstance(contract, dict):
            raise ValueError("Expected a JSON object in game.contract.json.")
        command = contract.get("headless_cmd")
        if not isinstance(command, str) or not command.strip():
            raise ValueError("Declare headless_cmd in game.contract.json.")

        with TemporaryDirectory() as directory:
            outputs = []
            for filename in ("first.jsonl", "second.jsonl"):
                output = Path(directory) / filename
                subprocess.run(
                    ["sh", "-c", command + ' "$@"', "headless_cmd", *flags,
                     "--out", str(output)],
                    cwd=ROOT,
                    check=True,
                )
                outputs.append(output.read_bytes())

        if outputs[0] != outputs[1]:
            raise ValueError("Headless output differed between runs with identical inputs.")
        validate_output(outputs[0], args.ticks, contract)
        args.out.parent.mkdir(parents=True, exist_ok=True)
        args.out.write_bytes(outputs[0])
    except (OSError, ValueError, subprocess.CalledProcessError) as error:
        raise SystemExit(f"Headless verification failed. {error}") from None

    print(f"Verified identical headless runs. Evidence saved to {args.out}")


if __name__ == "__main__":
    main()
