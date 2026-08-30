"""Aggregation method definitions published by the two-tuple model."""

AGGREGATION_METHODS = [
    {
        "key": "arithmetic_mean",
        "label": "2-Tuple Arithmetic Mean",
        "subparameters": [],
    },
    {
        "key": "weighted_average",
        "label": "2-Tuple Weighted Average",
        "subparameters": [],
    },
    {
        "key": "l2towa",
        "label": "L2TOWA",
        "subparameters": [
            {
                "key": "quantifier",
                "label": "Quantifier",
                "type": "select",
                "required": True,
                "default": "most",
                "options": [
                    {"value": "most", "label": "Most", "a": 0.3, "b": 0.8},
                    {
                        "value": "at_least_half",
                        "label": "At least half",
                        "a": 0,
                        "b": 0.5,
                    },
                    {
                        "value": "as_many_as_possible",
                        "label": "As many as possible",
                        "a": 0.5,
                        "b": 1,
                    },
                    {"value": "custom", "label": "Custom"},
                ],
            },
            {
                "key": "a",
                "label": "a",
                "type": "number",
                "required": True,
                "default": 0,
                "min": 0,
                "max": 1,
                "visibleWhen": {"field": "quantifier", "equals": "custom"},
            },
            {
                "key": "b",
                "label": "b",
                "type": "number",
                "required": True,
                "default": 1,
                "min": 0,
                "max": 1,
                "visibleWhen": {"field": "quantifier", "equals": "custom"},
            },
        ],
    },
]
