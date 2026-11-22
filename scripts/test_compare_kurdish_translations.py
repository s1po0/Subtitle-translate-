import importlib.util
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location('comparison', Path(__file__).with_name('compare-kurdish-translations.py'))
comparison = importlib.util.module_from_spec(spec)
spec.loader.exec_module(comparison)


class ComparisonTest(unittest.TestCase):
    def test_identical_and_unicode_normalization(self):
        self.assertAlmostEqual(comparison.score(['abcdef é'], ['abcdef e\u0301']), 100)

    def test_different(self):
        self.assertEqual(comparison.score(['abcdef'], ['uvwxyz']), 0)

    def test_bad_inputs(self):
        for ref, hyp in [([], []), (['a'], []), ([''], ['a'])]:
            with self.assertRaises(ValueError):
                comparison.score(ref, hyp)


if __name__ == '__main__':
    unittest.main()
