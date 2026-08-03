from models.herrera_viedma_crp.definition import (
    MODEL_DEFINITION as HERRERA_VIEDMA_DEFINITION,
)


def test_herrera_viedma_interval_global_metadata_is_canonical():
    parameters = [
        parameter
        for parameter in HERRERA_VIEDMA_DEFINITION.parameters
        if parameter.get("parameterStructureKey") == "intervalGlobal"
    ]

    assert parameters == [
        {
            "key": "ag_lq",
            "label": "Agreement interval",
            "parameterStructureKey": "intervalGlobal",
            "required": True,
            "default": [0.3, 0.8],
            "restrictions": {
                "min": 0,
                "max": 1,
                "ordered": "strictIncreasing",
                "length": None,
                "allowed": None,
            },
        },
        {
            "key": "ex_lq",
            "label": "Expert interval",
            "parameterStructureKey": "intervalGlobal",
            "required": True,
            "default": [0.5, 1],
            "restrictions": {
                "min": 0,
                "max": 1,
                "ordered": "strictIncreasing",
                "length": None,
                "allowed": None,
            },
        },
    ]
