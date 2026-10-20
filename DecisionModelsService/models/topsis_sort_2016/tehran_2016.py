"""Published Tehran data and rounded reference values from Sabokbar et al. (2016)."""

CRITERION_IDS = ("g1", "g2", "g3", "g4", "g5")

TEHRAN_CRITERIA = [
    {"criterion_id": "g1", "direction": "benefit", "weight": 0.2},
    {"criterion_id": "g2", "direction": "benefit", "weight": 0.2},
    {"criterion_id": "g3", "direction": "benefit", "weight": 0.2},
    {"criterion_id": "g4", "direction": "benefit", "weight": 0.2},
    {"criterion_id": "g5", "direction": "cost", "weight": 0.2},
]

_DISTRICT_VALUES = [
    (15.50, 82.40, 40.10, 70.66, 313.69),
    (9.90, 90.80, 22.00, 82.21, 130.61),
    (15.20, 82.30, 25.20, 65.57, 269.37),
    (23.40, 88.30, 60.20, 69.28, 119.03),
    (16.60, 76.80, 22.70, 69.28, 116.82),
    (12.40, 78.60, 22.60, 50.28, 199.55),
    (4.00, 85.00, 27.80, 51.40, 188.94),
    (4.40, 78.20, 25.60, 56.59, 126.37),
    (5.20, 80.20, 27.60, 86.29, 108.82),
    (2.30, 80.70, 24.20, 79.88, 97.95),
    (4.90, 77.70, 26.30, 61.28, 122.58),
    (5.70, 80.90, 26.80, 70.75, 82.75),
    (33.40, 85.30, 28.10, 67.68, 126.14),
    (5.90, 82.50, 29.80, 82.61, 149.32),
    (14.00, 88.50, 24.60, 90.71, 335.24),
    (11.40, 81.80, 26.50, 61.04, 139.62),
    (3.50, 78.90, 22.40, 60.82, 99.42),
    (12.96, 78.40, 25.20, 67.25, 180.18),
    (28.00, 82.40, 25.30, 56.89, 102.78),
    (15.70, 82.10, 27.70, 24.64, 193.52),
    (25.00, 91.30, 67.10, 79.81, 916.67),
    (48.00, 85.10, 49.20, 86.71, 173.79),
]

TEHRAN_ALTERNATIVES = [
    {
        "alternative_id": f"district-{index:02d}",
        "values_by_criterion_id": dict(zip(CRITERION_IDS, values)),
    }
    for index, values in enumerate(_DISTRICT_VALUES, start=1)
]

_PROFILE_VALUES = {
    "p1": (25, 80, 40, 80, 150),
    "p2": (20, 75, 30, 60, 300),
    "p3": (10, 70, 20, 30, 400),
    "p4": (0, 65, 10, 20, 700),
}

# The article numbers classes from best (C1) to worst (C5); the application
# contract orders them from least to most preferred, so this list is reversed.
TEHRAN_CATEGORIES = [
    {"category_id": "tehran-C5", "label": "Very low suitable", "order": 0},
    {"category_id": "tehran-C4", "label": "Low suitable", "order": 1},
    {"category_id": "tehran-C3", "label": "Moderately suitable", "order": 2},
    {"category_id": "tehran-C2", "label": "Suitable", "order": 3},
    {"category_id": "tehran-C1", "label": "High suitable", "order": 4},
]

# boundaryProfiles.category_id names the category entered at the boundary.
# In article notation p1 separates C2/C1, ... p4 separates C5/C4.
TEHRAN_PROFILES = [
    {
        "profile_id": profile_id,
        "category_id": f"tehran-{target_category}",
        "values_by_criterion_id": dict(zip(CRITERION_IDS, values)),
    }
    for profile_id, target_category, values in (
        ("p1", "C1", _PROFILE_VALUES["p1"]),
        ("p2", "C2", _PROFILE_VALUES["p2"]),
        ("p3", "C3", _PROFILE_VALUES["p3"]),
        ("p4", "C4", _PROFILE_VALUES["p4"]),
    )
]

# Values printed in Table 3 use g5/max without the Eq. (7) cost reflection.
# They are the equivalent display coordinates for tests: reflect our Eq. (7)
# g5 value back as weight - normalized_cost_value before comparing.
PUBLISHED_TABLE_3_DIRECT_WEIGHTED: dict[str, tuple[float, ...]] = {
    "district-01": (0.0646, 0.1805, 0.1195, 0.1558, 0.0684),
    "district-02": (0.0413, 0.1989, 0.0656, 0.1813, 0.0285),
    "district-03": (0.0633, 0.1803, 0.0751, 0.1446, 0.0588),
    "district-04": (0.0975, 0.1934, 0.1794, 0.1528, 0.0260),
    "district-05": (0.0692, 0.1682, 0.0677, 0.1528, 0.0255),
    "district-06": (0.0517, 0.1722, 0.0674, 0.1109, 0.0435),
    "district-07": (0.0167, 0.1862, 0.0829, 0.1133, 0.0412),
    "district-08": (0.0183, 0.1713, 0.0763, 0.1248, 0.0276),
    "district-09": (0.0217, 0.1757, 0.0823, 0.1903, 0.0237),
    "district-10": (0.0096, 0.1768, 0.0721, 0.1761, 0.0214),
    "district-11": (0.0204, 0.1702, 0.0784, 0.1351, 0.0267),
    "district-12": (0.0238, 0.1772, 0.0799, 0.1560, 0.0181),
    "district-13": (0.1392, 0.1869, 0.0838, 0.1492, 0.0275),
    "district-14": (0.0246, 0.1807, 0.0888, 0.1821, 0.0326),
    "district-15": (0.0583, 0.1939, 0.0733, 0.2000, 0.0731),
    "district-16": (0.0475, 0.1792, 0.0790, 0.1346, 0.0305),
    "district-17": (0.0146, 0.1728, 0.0668, 0.1341, 0.0217),
    "district-18": (0.0540, 0.1717, 0.0751, 0.1483, 0.0393),
    "district-19": (0.1167, 0.1805, 0.0754, 0.1254, 0.0224),
    "district-20": (0.0654, 0.1798, 0.0826, 0.0543, 0.0422),
    "district-21": (0.1042, 0.2000, 0.2000, 0.1760, 0.2000),
    "district-22": (0.2000, 0.1864, 0.1466, 0.1912, 0.0379),
    "p1": (0.1042, 0.1752, 0.1192, 0.1764, 0.0327),
    "p2": (0.0833, 0.1643, 0.0894, 0.1323, 0.0655),
    "p3": (0.0417, 0.1533, 0.0596, 0.0661, 0.0873),
    "p4": (0.0000, 0.1424, 0.0298, 0.0441, 0.1527),
}

PUBLISHED_TABLE_3_IDEAL_DIRECT = (0.2000, 0.2000, 0.2000, 0.2000, 0.0181)
PUBLISHED_TABLE_3_ANTI_IDEAL_DIRECT = (0.0000, 0.1424, 0.0298, 0.0441, 0.2000)

PUBLISHED_TABLE_4_DISTANCES = {
    "district-01": (0.17230, 0.20850, 0.54753),
    "district-02": (0.20910, 0.23320, 0.52724),
    "district-03": (0.19850, 0.19380, 0.49401),
    "district-04": (0.11520, 0.27680, 0.70612),
    "district-05": (0.19480, 0.22170, 0.53229),
    "district-06": (0.22130, 0.18410, 0.45412),
    "district-07": (0.23570, 0.18710, 0.44253),
    "district-08": (0.23430, 0.19890, 0.45914),
    "district-09": (0.21540, 0.23820, 0.52513),
    "district-10": (0.23180, 0.22890, 0.49685),
    "district-11": (0.22850, 0.20460, 0.47241),
    "district-12": (0.21900, 0.22340, 0.50497),
    "district-13": (0.14160, 0.25510, 0.64306),
    "district-14": (0.20980, 0.22940, 0.52231),
    "district-15": (0.19800, 0.21990, 0.52620),
    "district-16": (0.20680, 0.20730, 0.50060),
    "district-17": (0.23920, 0.20590, 0.46259),
    "district-18": (0.20210, 0.20620, 0.50502),
    "district-19": (0.16860, 0.23510, 0.58236),
    "district-20": (0.23260, 0.18290, 0.44019),
    "district-21": (0.20700, 0.24600, 0.54305),
    "district-22": (0.05920, 0.32170, 0.84458),
    "p1": (0.13070, 0.25570, 0.66175),
    "p2": (0.18420, 0.19200, 0.51037),
    "p3": (0.26390, 0.12620, 0.32351),
    "p4": (0.33870, 0.04730, 0.12254),
}

PUBLISHED_TABLE_5_CLASS_BY_DISTRICT = (
    2, 2, 3, 1, 2, 3, 3, 3, 2, 3, 3, 3, 2, 2, 2, 3, 3, 3, 2, 3, 2, 1,
)
