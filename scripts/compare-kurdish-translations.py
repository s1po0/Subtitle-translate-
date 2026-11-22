#!/usr/bin/env python3
"""Compare aligned translation files with a simple corpus character F-score.

Inputs are UTF-8 text files, one aligned sentence per line. This is a lexical
similarity diagnostic, NOT a semantic quality metric or a standard chrF score.
No corpus or translation service is included or contacted by this script.
"""
import argparse
from collections import Counter
import unicodedata


def read_lines(path):
    with open(path, encoding='utf-8-sig') as stream:
        return [line.strip() for line in stream.read().splitlines()]


def normalize(text):
    return ''.join(unicodedata.normalize('NFC', text).split())


def score(reference, hypothesis):
    if len(reference) != len(hypothesis) or not reference:
        raise ValueError('Files must contain the same nonzero number of lines.')
    if any(not r or not h for r, h in zip(reference, hypothesis)):
        raise ValueError('Blank aligned sentences are not supported.')
    scores = []
    for n in range(1, 7):
        matched = total_ref = total_hyp = 0
        for ref, hyp in zip(reference, hypothesis):
            ref, hyp = normalize(ref), normalize(hyp)
            a = Counter(ref[i:i+n] for i in range(max(0, len(ref)-n+1)))
            b = Counter(hyp[i:i+n] for i in range(max(0, len(hyp)-n+1)))
            matched += sum((a & b).values())
            total_ref += sum(a.values())
            total_hyp += sum(b.values())
        precision = matched / total_hyp if total_hyp else 0
        recall = matched / total_ref if total_ref else 0
        scores.append(2 * precision * recall / (precision + recall) if precision + recall else 0)
    return 100 * sum(scores) / len(scores)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('reference')
    parser.add_argument('hypothesis')
    args = parser.parse_args()
    try:
        reference, hypothesis = read_lines(args.reference), read_lines(args.hypothesis)
        value = score(reference, hypothesis)
    except (OSError, UnicodeError, ValueError) as error:
        parser.error(str(error))
    print(f'Aligned sentences: {len(reference)}')
    print(f'Character n-gram F1 (1–6, whitespace removed): {value:.2f}/100')
    print('Lexical overlap only; different correct translations may score poorly.')


if __name__ == '__main__':
    main()
