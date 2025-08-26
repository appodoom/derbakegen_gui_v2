import argparse
import json
import numpy as np
import soundfile as sf
from config import get_audio_data
import random


def get_probability_matrix(matrix, notes):
    return dict(zip(notes, matrix))


def get_random_proba_list(weights):
    output = []
    for weight in weights:
        choice = random.uniform(0, weight)
        output.append(choice)
    return output


def squeleton_generator(bpm, squeleton, num_cycles, sr=48000):
    beat_length_in_samples = int((60 / bpm) * sr)
    skeleton_length = len(squeleton)
    num_of_beats_in_audio = num_cycles * sum(x[0] for x in squeleton)

    # [(1, D), (2.5, T), (2, S)]
    length_in_samples = int(
        sum([x[0] * beat_length_in_samples for x in squeleton]) * num_cycles
    )
    squeleton_hits_intervals = []
    y = np.zeros(length_in_samples + beat_length_in_samples)

    curr_beat = i = 0
    while curr_beat <= num_of_beats_in_audio:
        curr_beat += squeleton[i % skeleton_length][0]
        curr_hit = squeleton[i % skeleton_length][1]
        y_hit = get_audio_data(curr_hit, sr)
        hit_timestamp = int(curr_beat * beat_length_in_samples)
        end_of_hit_timestamp = hit_timestamp + len(y_hit)

        if end_of_hit_timestamp <= len(y):
            y[hit_timestamp:end_of_hit_timestamp] += y_hit
            squeleton_hits_intervals.append((hit_timestamp, end_of_hit_timestamp))
        i += 1
    y_without_initial_silence = y[squeleton_hits_intervals[0][0] - 10 :]
    # sf.write(
    #     "./generated/squeleton.wav",
    #     data=y_without_initial_silence,
    #     samplerate=sr,
    # )
    return (
        y_without_initial_silence,
        beat_length_in_samples,
        squeleton_hits_intervals,
    )


def subdivisions_generator(
    y,
    maxsubd,
    added_hits_intervals,
    beat_length_in_samples,
    hit_probabilities,
):
    added_hits_intervals = sorted(added_hits_intervals, key=lambda x: x[0])
    subdivisions_y = np.zeros(len(y))
    sample_of_curr_subd = 0
    maxsubd_length = int(beat_length_in_samples / maxsubd)
    hits = list(hit_probabilities.keys())
    weights = list(hit_probabilities.values())
    new_added_hits_intervals = []
    while sample_of_curr_subd < len(subdivisions_y):
        remaining = len(subdivisions_y) - sample_of_curr_subd
        random_proba_list = get_random_proba_list(weights)
        chosen_hit = random.choices(hits, weights=random_proba_list, k=1)[0]
        if chosen_hit == "S":
            sample_of_curr_subd += maxsubd_length
        else:
            hit_y = get_audio_data(chosen_hit)
            add_len = min(len(hit_y), remaining)

            for start, _ in added_hits_intervals:
                if start <= sample_of_curr_subd <= start + maxsubd_length:
                    sample_of_curr_subd += maxsubd_length
                    break
            else:
                subdivisions_y[sample_of_curr_subd : sample_of_curr_subd + add_len] += (
                    hit_y[:add_len]
                )
                new_added_hits_intervals.append(
                    (
                        sample_of_curr_subd,
                        sample_of_curr_subd + add_len,
                    )
                )
                sample_of_curr_subd += maxsubd_length
    y += subdivisions_y
    new_added_hits_intervals.extend(added_hits_intervals)
    return y, new_added_hits_intervals


def get_probabilities_per_subd(maxsubd, number_of_hits, hits_list, probabilities_matrix):
    processes = []
    for col_index in range(maxsubd):
        current_process = {}
        sum_of_probabilities = 0
        for j in range(number_of_hits):
            current_hit = hits_list[j]
            current_process[current_hit] = probabilities_matrix[current_hit][col_index]
            sum_of_probabilities += probabilities_matrix[current_hit][col_index]
        if sum_of_probabilities > 100:
            raise ValueError(
                f"Column {col_index} probabilities sum to {sum_of_probabilities} (>100). "
                "Reduce one or more values so that the sum ≤ 100."
            )

        current_process["S"] = 100 - sum_of_probabilities
        processes.append(current_process)
    if len(processes) != maxsubd:
        raise ValueError(
            f"Expected {maxsubd} probability columns, got {len(processes)}."
        )
    return processes


def subdivisions_generator_adjusted(
    maxsubd,
    probabilities_matrix,
    bpm,
    squeleton,
    num_cycles,
    sr=48000,
):
    hits_list = list(probabilities_matrix.keys())
    number_of_hits = len(hits_list)
    probabilities_per_subd = get_probabilities_per_subd(
        maxsubd=maxsubd,
        number_of_hits=number_of_hits,
        hits_list=hits_list,
        probabilities_matrix=probabilities_matrix,
    )
    y, beat_length_in_samples, added_hits_intervals = squeleton_generator(
        bpm=bpm, squeleton=squeleton, num_cycles=num_cycles, sr=sr
    )
    for subdiv in range(1, maxsubd, 1):
        y, added_hits_intervals = subdivisions_generator(
            y=y,
            maxsubd=subdiv,
            added_hits_intervals=added_hits_intervals,
            beat_length_in_samples=beat_length_in_samples,
            hit_probabilities=probabilities_per_subd[subdiv],
        )
    sf.write(
        "./generated.wav",
        y,
        samplerate=48000,
    )
    return y

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Generate rhythmic subdivisions")
    parser.add_argument("--maxsubd", type=int, required=True, help="Maximum subdivisions")
    parser.add_argument("--bpm", type=int, required=True, help="Beats per minute")
    parser.add_argument("--probabilities_matrix", type=str, required=True, help="JSON list of lists for probabilities matrix")
    parser.add_argument("--notes", type=str, required=True, help="JSON list of notes")
    parser.add_argument("--squeleton", type=str, required=True, help="JSON list of skeleton tuples like [[1, 'D'], [1, 'T1']]")
    parser.add_argument("--num_cycles", type=int, required=True, help="Number of cycles")

    args = parser.parse_args()

    # Parse JSON arguments
    matrix = json.loads(args.probabilities_matrix)
    notes = json.loads(args.notes)
    squeleton = [tuple(x) for x in json.loads(args.squeleton)]

    probabilities_matrix = get_probability_matrix(matrix=matrix, notes=notes)

    subdivisions_generator_adjusted(
        maxsubd=args.maxsubd,
        bpm=args.bpm,
        probabilities_matrix=probabilities_matrix,
        squeleton=squeleton,
        num_cycles=args.num_cycles,
    )