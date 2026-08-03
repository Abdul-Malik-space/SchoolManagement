const mongoose = require("mongoose");

const {
  Schema
} = mongoose;

/*
|--------------------------------------------------------------------------
| Grade Scheme Constants
|--------------------------------------------------------------------------
*/

const GRADE_SCHEME_STATUSES = [
  "draft",
  "active",
  "archived"
];

const GRADE_RESULT_STATUSES = [
  "pass",
  "fail",
  "conditional"
];

const ROUNDING_MODES = [
  "none",
  "nearest",
  "floor",
  "ceil"
];

const EXAM_TYPES = [
  "monthly_test",
  "class_test",
  "mid_term",
  "final_term",
  "annual_exam",
  "practical_exam",
  "quiz",
  "assignment",
  "other"
];

/*
|--------------------------------------------------------------------------
| Normalization Helpers
|--------------------------------------------------------------------------
*/

const normalizeText = (
  value
) => {
  if (
    value ===
      null ||
    value ===
      undefined
  ) {
    return "";
  }

  return String(
    value
  )
    .trim()
    .replace(
      /\s+/g,
      " "
    );
};

const normalizeCode = (
  value
) => {
  return normalizeText(
    value
  )
    .toUpperCase()
    .replace(
      /[^A-Z0-9_-]+/g,
      "-"
    )
    .replace(
      /-+/g,
      "-"
    )
    .replace(
      /^[-_]+|[-_]+$/g,
      ""
    );
};

const normalizeHexColor = (
  value
) => {
  const color =
    normalizeText(
      value
    ).toUpperCase();

  if (!color) {
    return "";
  }

  return color.startsWith(
    "#"
  )
    ? color
    : `#${color}`;
};

const roundNumber = (
  value,
  precision = 2
) => {
  const number =
    Number(
      value || 0
    );

  const multiplier =
    10 ** precision;

  return (
    Math.round(
      (
        number +
        Number.EPSILON
      ) *
        multiplier
    ) /
    multiplier
  );
};

const objectIdKey = (
  value
) => {
  if (!value) {
    return "";
  }

  return String(
    value?._id ||
    value
  );
};

const nearlyEqual = (
  first,
  second,
  tolerance = 0.000001
) => {
  return (
    Math.abs(
      Number(first) -
      Number(second)
    ) <=
    tolerance
  );
};

/*
|--------------------------------------------------------------------------
| Grade Band Schema
|--------------------------------------------------------------------------
|
| Range rule:
| - minimumPercentage is inclusive.
| - maximumPercentage is exclusive.
| - The highest band ending at 100 also includes an exact score of 100.
|
| Example:
| A+ = 90 to 100
| A  = 80 to 90
|
| A score of 90 belongs to A+, while 89.99 belongs to A.
|
*/

const gradeBandSchema =
  new Schema(
    {
      grade: {
        type: String,

        required: [
          true,
          "Grade symbol is required"
        ],

        trim: true,

        maxlength: [
          20,
          "Grade symbol cannot exceed 20 characters"
        ]
      },

      label: {
        type: String,

        trim: true,

        maxlength: [
          100,
          "Grade label cannot exceed 100 characters"
        ],

        default: ""
      },

      minimumPercentage: {
        type: Number,

        required: [
          true,
          "Minimum percentage is required"
        ],

        min: [
          0,
          "Minimum percentage cannot be negative"
        ],

        max: [
          100,
          "Minimum percentage cannot exceed 100"
        ]
      },

      maximumPercentage: {
        type: Number,

        required: [
          true,
          "Maximum percentage is required"
        ],

        min: [
          0,
          "Maximum percentage cannot be negative"
        ],

        max: [
          100,
          "Maximum percentage cannot exceed 100"
        ]
      },

      gradePoint: {
        type: Number,

        default: 0,

        min: [
          0,
          "Grade point cannot be negative"
        ],

        max: [
          10,
          "Grade point cannot exceed 10"
        ]
      },

      resultStatus: {
        type: String,

        enum: {
          values:
            GRADE_RESULT_STATUSES,

          message:
            "{VALUE} is not a valid grade result status"
        },

        required: [
          true,
          "Grade result status is required"
        ],

        default:
          "pass"
      },

      remarks: {
        type: String,

        trim: true,

        maxlength: [
          300,
          "Grade remarks cannot exceed 300 characters"
        ],

        default: ""
      },

      displayColor: {
        type: String,

        trim: true,

        maxlength: [
          7,
          "Display color must be a valid hex color"
        ],

        default: ""
      },

      displayOrder: {
        type: Number,

        default: 0,

        min: [
          0,
          "Grade display order cannot be negative"
        ]
      }
    },
    {
      _id: false
    }
  );

/*
|--------------------------------------------------------------------------
| Calculation Settings Schema
|--------------------------------------------------------------------------
*/

const calculationSettingsSchema =
  new Schema(
    {
      percentagePrecision: {
        type: Number,

        enum: {
          values: [
            0,
            1,
            2
          ],

          message:
            "Percentage precision must be 0, 1 or 2"
        },

        default: 2
      },

      roundingMode: {
        type: String,

        enum: {
          values:
            ROUNDING_MODES,

          message:
            "{VALUE} is not a valid rounding mode"
        },

        default:
          "nearest"
      },

      gradePointPrecision: {
        type: Number,

        enum: {
          values: [
            0,
            1,
            2
          ],

          message:
            "Grade point precision must be 0, 1 or 2"
        },

        default: 2
      },

      capPercentageAtHundred: {
        type: Boolean,
        default: true
      },

      allowExtraCredit: {
        type: Boolean,
        default: false
      }
    },
    {
      _id: false
    }
  );

/*
|--------------------------------------------------------------------------
| Grade Scheme Schema
|--------------------------------------------------------------------------
*/

const gradeSchemeSchema =
  new Schema(
    {
      /*
      |--------------------------------------------------------------------------
      | School Scope
      |--------------------------------------------------------------------------
      */

      schoolId: {
        type:
          Schema.Types
            .ObjectId,

        ref: "School",

        required: [
          true,
          "School ID is required"
        ],

        index: true
      },

      /*
      |--------------------------------------------------------------------------
      | Scheme Identity
      |--------------------------------------------------------------------------
      */

      schemeCode: {
        type: String,

        required: [
          true,
          "Grade scheme code is required"
        ],

        trim: true,

        minlength: [
          2,
          "Grade scheme code must contain at least 2 characters"
        ],

        maxlength: [
          50,
          "Grade scheme code cannot exceed 50 characters"
        ]
      },

      schemeName: {
        type: String,

        required: [
          true,
          "Grade scheme name is required"
        ],

        trim: true,

        minlength: [
          3,
          "Grade scheme name must contain at least 3 characters"
        ],

        maxlength: [
          160,
          "Grade scheme name cannot exceed 160 characters"
        ]
      },

      academicYear: {
        type: String,

        required: [
          true,
          "Academic year is required"
        ],

        trim: true,

        maxlength: [
          30,
          "Academic year cannot exceed 30 characters"
        ],

        index: true
      },

      description: {
        type: String,

        trim: true,

        maxlength: [
          2000,
          "Grade scheme description cannot exceed 2000 characters"
        ],

        default: ""
      },

      /*
      |--------------------------------------------------------------------------
      | Scope
      |--------------------------------------------------------------------------
      */

      applicableClassIds: {
        type: [
          {
            type:
              Schema.Types
                .ObjectId,

            ref: "Class"
          }
        ],

        default: []
      },

      applicableExamTypes: {
        type: [
          {
            type: String,

            enum: {
              values:
                EXAM_TYPES,

              message:
                "{VALUE} is not a valid exam type"
            }
          }
        ],

        default: []
      },

      effectiveFrom: {
        type: Date,
        default: null
      },

      effectiveTo: {
        type: Date,
        default: null
      },

      /*
      |--------------------------------------------------------------------------
      | Grading Rules
      |--------------------------------------------------------------------------
      */

      bands: {
        type: [
          gradeBandSchema
        ],

        required: [
          true,
          "At least one grade band is required"
        ],

        validate: {
          validator(
            bands
          ) {
            return (
              Array.isArray(
                bands
              ) &&
              bands.length >
                0
            );
          },

          message:
            "At least one grade band must be added"
        }
      },

      minimumPassingPercentage: {
        type: Number,

        default: 40,

        min: [
          0,
          "Minimum passing percentage cannot be negative"
        ],

        max: [
          100,
          "Minimum passing percentage cannot exceed 100"
        ]
      },

      calculationSettings: {
        type:
          calculationSettingsSchema,

        default:
          () => ({})
      },

      /*
      |--------------------------------------------------------------------------
      | Status and Default Selection
      |--------------------------------------------------------------------------
      */

      status: {
        type: String,

        enum: {
          values:
            GRADE_SCHEME_STATUSES,

          message:
            "{VALUE} is not a valid grade scheme status"
        },

        default:
          "draft",

        index: true
      },

      isDefault: {
        type: Boolean,
        default: false,
        index: true
      },

      isActive: {
        type: Boolean,
        default: false,
        index: true
      },

      activatedAt: {
        type: Date,
        default: null
      },

      activatedBy: {
        type:
          Schema.Types
            .ObjectId,

        ref: "User",

        default: null
      },

      archivedAt: {
        type: Date,
        default: null
      },

      archivedBy: {
        type:
          Schema.Types
            .ObjectId,

        ref: "User",

        default: null
      },

      versionNumber: {
        type: Number,

        default: 1,

        min: [
          1,
          "Grade scheme version number must be at least 1"
        ]
      },

      /*
      |--------------------------------------------------------------------------
      | Record Tracking
      |--------------------------------------------------------------------------
      */

      createdBy: {
        type:
          Schema.Types
            .ObjectId,

        ref: "User",

        required: [
          true,
          "Grade scheme creator is required"
        ]
      },

      updatedBy: {
        type:
          Schema.Types
            .ObjectId,

        ref: "User",

        default: null
      },

      isDeleted: {
        type: Boolean,
        default: false,
        index: true
      },

      deletedAt: {
        type: Date,
        default: null
      },

      deletedBy: {
        type:
          Schema.Types
            .ObjectId,

        ref: "User",

        default: null
      }
    },
    {
      timestamps: true,

      optimisticConcurrency:
        true,

      toJSON: {
        virtuals: true,

        transform(
          document,
          returnedObject
        ) {
          delete returnedObject.__v;

          return returnedObject;
        }
      },

      toObject: {
        virtuals: true
      }
    }
  );

/*
|--------------------------------------------------------------------------
| Indexes
|--------------------------------------------------------------------------
*/

gradeSchemeSchema.index(
  {
    schoolId: 1,
    schemeCode: 1,
    academicYear: 1
  },
  {
    unique: true,

    partialFilterExpression: {
      isDeleted: false
    },

    name:
      "unique_active_grade_scheme_code"
  }
);

gradeSchemeSchema.index(
  {
    schoolId: 1,
    academicYear: 1,
    isDefault: 1
  },
  {
    unique: true,

    partialFilterExpression: {
      isDeleted: false,
      status: "active",
      isDefault: true
    },

    name:
      "one_default_active_grade_scheme_per_school_year"
  }
);

gradeSchemeSchema.index({
  schoolId: 1,
  academicYear: 1,
  status: 1,
  isDeleted: 1,
  createdAt: -1
});

gradeSchemeSchema.index({
  schoolId: 1,
  applicableClassIds: 1,
  status: 1,
  isDeleted: 1
});

gradeSchemeSchema.index({
  schoolId: 1,
  applicableExamTypes: 1,
  status: 1,
  isDeleted: 1
});

gradeSchemeSchema.index({
  schoolId: 1,
  effectiveFrom: 1,
  effectiveTo: 1,
  status: 1,
  isDeleted: 1
});

/*
|--------------------------------------------------------------------------
| Validation and Normalization
|--------------------------------------------------------------------------
*/

gradeSchemeSchema.pre(
  "validate",
  function validateGradeScheme() {
    this.schemeCode =
      normalizeCode(
        this.schemeCode
      );

    this.schemeName =
      normalizeText(
        this.schemeName
      );

    this.academicYear =
      normalizeText(
        this.academicYear
      );

    this.description =
      normalizeText(
        this.description
      );

    if (
      !this.schemeCode
    ) {
      this.invalidate(
        "schemeCode",
        "Grade scheme code must contain letters or numbers"
      );
    }

    if (
      this.effectiveFrom &&
      this.effectiveTo &&
      this.effectiveTo <
        this.effectiveFrom
    ) {
      this.invalidate(
        "effectiveTo",
        "Effective end date cannot be before the start date"
      );
    }

    /*
    |--------------------------------------------------------------------------
    | Normalize Scope Arrays
    |--------------------------------------------------------------------------
    */

    this.applicableClassIds =
      Array.from(
        new Set(
          (
            this.applicableClassIds ||
            []
          )
            .map(
              objectIdKey
            )
            .filter(
              Boolean
            )
        )
      );

    this.applicableExamTypes =
      Array.from(
        new Set(
          (
            this.applicableExamTypes ||
            []
          )
            .map(
              (
                value
              ) =>
                normalizeText(
                  value
                ).toLowerCase()
            )
            .filter(
              Boolean
            )
        )
      );

    /*
    |--------------------------------------------------------------------------
    | Grade Band Validation
    |--------------------------------------------------------------------------
    */

    const usedGrades =
      new Set();

    if (
      Array.isArray(
        this.bands
      )
    ) {
      this.bands.forEach(
        (
          band,
          index
        ) => {
          band.grade =
            normalizeText(
              band.grade
            ).toUpperCase();

          band.label =
            normalizeText(
              band.label ||
              band.grade
            );

          band.remarks =
            normalizeText(
              band.remarks
            );

          band.displayColor =
            normalizeHexColor(
              band.displayColor
            );

          band.minimumPercentage =
            roundNumber(
              band.minimumPercentage,
              4
            );

          band.maximumPercentage =
            roundNumber(
              band.maximumPercentage,
              4
            );

          band.gradePoint =
            roundNumber(
              band.gradePoint,
              2
            );

          if (
            usedGrades.has(
              band.grade
            )
          ) {
            this.invalidate(
              `bands.${index}.grade`,
              `Grade ${band.grade} is duplicated`
            );
          }

          usedGrades.add(
            band.grade
          );

          if (
            Number(
              band.maximumPercentage
            ) <=
            Number(
              band.minimumPercentage
            )
          ) {
            this.invalidate(
              `bands.${index}.maximumPercentage`,
              "Maximum percentage must be greater than minimum percentage"
            );
          }

          if (
            band.displayColor &&
            !/^#[0-9A-F]{6}$/.test(
              band.displayColor
            )
          ) {
            this.invalidate(
              `bands.${index}.displayColor`,
              "Display color must use a six-digit hex value such as #16A34A"
            );
          }
        }
      );

      this.bands.sort(
        (
          first,
          second
        ) => {
          return (
            Number(
              second.minimumPercentage
            ) -
              Number(
                first.minimumPercentage
              ) ||
            Number(
              first.displayOrder ||
              0
            ) -
              Number(
                second.displayOrder ||
                0
              )
          );
        }
      );

      this.bands.forEach(
        (
          band,
          index
        ) => {
          const higherBand =
            index > 0
              ? this.bands[
                  index - 1
                ]
              : null;

          if (
            higherBand &&
            !nearlyEqual(
              band.maximumPercentage,
              higherBand.minimumPercentage
            )
          ) {
            this.invalidate(
              `bands.${index}.maximumPercentage`,
              `Grade ${band.grade} must end where grade ${higherBand.grade} begins`
            );
          }
        }
      );

      /*
      |--------------------------------------------------------------------------
      | Active Scheme Must Cover Every Percentage
      |--------------------------------------------------------------------------
      */

      if (
        this.status ===
        "active"
      ) {
        const highestBand =
          this.bands[0];

        const lowestBand =
          this.bands[
            this.bands.length -
              1
          ];

        if (
          !highestBand ||
          !nearlyEqual(
            highestBand.maximumPercentage,
            100
          )
        ) {
          this.invalidate(
            "bands",
            "An active grade scheme must cover scores up to 100 percent"
          );
        }

        if (
          !lowestBand ||
          !nearlyEqual(
            lowestBand.minimumPercentage,
            0
          )
        ) {
          this.invalidate(
            "bands",
            "An active grade scheme must cover scores from 0 percent"
          );
        }
      }

      /*
      |--------------------------------------------------------------------------
      | Passing Threshold Consistency
      |--------------------------------------------------------------------------
      */

      const lowestPassingBand =
        [...this.bands]
          .reverse()
          .find(
            (
              band
            ) =>
              band.resultStatus !==
              "fail"
          );

      if (
        lowestPassingBand &&
        !nearlyEqual(
          this.minimumPassingPercentage,
          lowestPassingBand.minimumPercentage
        )
      ) {
        this.invalidate(
          "minimumPassingPercentage",
          `Minimum passing percentage must match the lowest passing grade (${lowestPassingBand.minimumPercentage})`
        );
      }
    }

    /*
    |--------------------------------------------------------------------------
    | Status Rules
    |--------------------------------------------------------------------------
    */

    if (
      this.status ===
      "active"
    ) {
      this.isActive = true;

      if (
        !this.activatedAt
      ) {
        this.activatedAt =
          new Date();
      }
    } else {
      this.isActive = false;
    }

    if (
      this.status ===
      "archived"
    ) {
      this.isDefault = false;

      if (
        !this.archivedAt
      ) {
        this.archivedAt =
          new Date();
      }
    }

    if (
      this.status !==
      "active"
    ) {
      this.isDefault = false;
    }

    if (
      this.isDeleted
    ) {
      this.isActive = false;
      this.isDefault = false;

      if (
        !this.deletedAt
      ) {
        this.deletedAt =
          new Date();
      }
    } else {
      this.deletedAt = null;
      this.deletedBy = null;
    }
  }
);

/*
|--------------------------------------------------------------------------
| Virtual Fields
|--------------------------------------------------------------------------
*/

gradeSchemeSchema.virtual(
  "bandCount"
).get(
  function getBandCount() {
    return Array.isArray(
      this.bands
    )
      ? this.bands.length
      : 0;
  }
);

gradeSchemeSchema.virtual(
  "passingBandCount"
).get(
  function getPassingBandCount() {
    return (
      this.bands ||
      []
    ).filter(
      (
        band
      ) =>
        band.resultStatus !==
        "fail"
    ).length;
  }
);

gradeSchemeSchema.virtual(
  "failingBandCount"
).get(
  function getFailingBandCount() {
    return (
      this.bands ||
      []
    ).filter(
      (
        band
      ) =>
        band.resultStatus ===
        "fail"
    ).length;
  }
);

gradeSchemeSchema.virtual(
  "isEditable"
).get(
  function getIsEditable() {
    return (
      !this.isDeleted &&
      this.status !==
        "archived"
    );
  }
);

gradeSchemeSchema.virtual(
  "coverageComplete"
).get(
  function getCoverageComplete() {
    if (
      !Array.isArray(
        this.bands
      ) ||
      this.bands.length ===
        0
    ) {
      return false;
    }

    const sorted =
      [
        ...this.bands
      ].sort(
        (
          first,
          second
        ) =>
          Number(
            second.minimumPercentage
          ) -
          Number(
            first.minimumPercentage
          )
      );

    if (
      !nearlyEqual(
        sorted[0]
          .maximumPercentage,
        100
      ) ||
      !nearlyEqual(
        sorted[
          sorted.length -
            1
        ].minimumPercentage,
        0
      )
    ) {
      return false;
    }

    return sorted.every(
      (
        band,
        index
      ) => {
        if (
          index ===
          0
        ) {
          return true;
        }

        return nearlyEqual(
          band.maximumPercentage,
          sorted[
            index - 1
          ].minimumPercentage
        );
      }
    );
  }
);

/*
|--------------------------------------------------------------------------
| Instance Methods
|--------------------------------------------------------------------------
*/

gradeSchemeSchema.methods.normalizePercentage =
  function normalizePercentage(
    percentage
  ) {
    let value =
      Number(
        percentage
      );

    if (
      !Number.isFinite(
        value
      )
    ) {
      return null;
    }

    const settings =
      this.calculationSettings ||
      {};

    if (
      settings
        .capPercentageAtHundred &&
      !settings.allowExtraCredit
    ) {
      value =
        Math.min(
          100,
          value
        );
    }

    value =
      Math.max(
        0,
        value
      );

    const precision =
      Number(
        settings
          .percentagePrecision ??
        2
      );

    const multiplier =
      10 ** precision;

    switch (
      settings.roundingMode
    ) {
      case "floor":
        value =
          Math.floor(
            value *
              multiplier
          ) /
          multiplier;
        break;

      case "ceil":
        value =
          Math.ceil(
            value *
              multiplier
          ) /
          multiplier;
        break;

      case "nearest":
        value =
          Math.round(
            (
              value +
              Number.EPSILON
            ) *
              multiplier
          ) /
          multiplier;
        break;

      case "none":
      default:
        break;
    }

    return value;
  };

gradeSchemeSchema.methods.resolveGrade =
  function resolveGrade(
    percentage
  ) {
    const normalizedPercentage =
      this.normalizePercentage(
        percentage
      );

    if (
      normalizedPercentage ===
      null
    ) {
      return null;
    }

    const sortedBands =
      [
        ...(
          this.bands ||
          []
        )
      ].sort(
        (
          first,
          second
        ) =>
          Number(
            second.minimumPercentage
          ) -
          Number(
            first.minimumPercentage
          )
      );

    const matchedBand =
      sortedBands.find(
        (
          band
        ) => {
          const minimum =
            Number(
              band.minimumPercentage
            );

          const maximum =
            Number(
              band.maximumPercentage
            );

          const isTopBand =
            nearlyEqual(
              maximum,
              100
            );

          return (
            normalizedPercentage >=
              minimum &&
            (
              normalizedPercentage <
                maximum ||
              (
                isTopBand &&
                normalizedPercentage <=
                  100
              )
            )
          );
        }
      );

    if (!matchedBand) {
      return null;
    }

    return {
      percentage:
        normalizedPercentage,

      grade:
        matchedBand.grade,

      label:
        matchedBand.label,

      gradePoint:
        roundNumber(
          matchedBand.gradePoint,
          this.calculationSettings
            ?.gradePointPrecision ??
            2
        ),

      resultStatus:
        matchedBand.resultStatus,

      remarks:
        matchedBand.remarks,

      displayColor:
        matchedBand.displayColor,

      minimumPercentage:
        matchedBand.minimumPercentage,

      maximumPercentage:
        matchedBand.maximumPercentage
    };
  };

/*
|--------------------------------------------------------------------------
| Static Helpers
|--------------------------------------------------------------------------
*/

gradeSchemeSchema.statics.getStandardBands =
  function getStandardBands() {
    return [
      {
        grade:
          "A+",

        label:
          "Outstanding",

        minimumPercentage:
          90,

        maximumPercentage:
          100,

        gradePoint:
          4,

        resultStatus:
          "pass",

        displayColor:
          "#15803D",

        displayOrder:
          1
      },

      {
        grade:
          "A",

        label:
          "Excellent",

        minimumPercentage:
          80,

        maximumPercentage:
          90,

        gradePoint:
          3.7,

        resultStatus:
          "pass",

        displayColor:
          "#16A34A",

        displayOrder:
          2
      },

      {
        grade:
          "B",

        label:
          "Very Good",

        minimumPercentage:
          70,

        maximumPercentage:
          80,

        gradePoint:
          3,

        resultStatus:
          "pass",

        displayColor:
          "#2563EB",

        displayOrder:
          3
      },

      {
        grade:
          "C",

        label:
          "Good",

        minimumPercentage:
          60,

        maximumPercentage:
          70,

        gradePoint:
          2.5,

        resultStatus:
          "pass",

        displayColor:
          "#7C3AED",

        displayOrder:
          4
      },

      {
        grade:
          "D",

        label:
          "Satisfactory",

        minimumPercentage:
          50,

        maximumPercentage:
          60,

        gradePoint:
          2,

        resultStatus:
          "pass",

        displayColor:
          "#D97706",

        displayOrder:
          5
      },

      {
        grade:
          "E",

        label:
          "Pass",

        minimumPercentage:
          40,

        maximumPercentage:
          50,

        gradePoint:
          1,

        resultStatus:
          "pass",

        displayColor:
          "#EA580C",

        displayOrder:
          6
      },

      {
        grade:
          "F",

        label:
          "Fail",

        minimumPercentage:
          0,

        maximumPercentage:
          40,

        gradePoint:
          0,

        resultStatus:
          "fail",

        displayColor:
          "#DC2626",

        displayOrder:
          7
      }
    ];
  };

gradeSchemeSchema.statics.getDefaultForSchool =
  function getDefaultForSchool(
    schoolId,
    academicYear
  ) {
    return this.findOne({
      schoolId,

      academicYear:
        normalizeText(
          academicYear
        ),

      status:
        "active",

      isDefault:
        true,

      isDeleted: {
        $ne: true
      }
    });
  };

gradeSchemeSchema.statics.buildActiveFilter =
  function buildActiveFilter(
    schoolId,
    extraFilter = {}
  ) {
    return {
      schoolId,

      status:
        "active",

      isActive:
        true,

      isDeleted: {
        $ne: true
      },

      ...extraFilter
    };
  };

/*
|--------------------------------------------------------------------------
| Model Export
|--------------------------------------------------------------------------
*/

const GradeScheme =
  mongoose.model(
    "GradeScheme",
    gradeSchemeSchema
  );

module.exports =
  GradeScheme;

module.exports.GRADE_SCHEME_STATUSES =
  GRADE_SCHEME_STATUSES;

module.exports.GRADE_RESULT_STATUSES =
  GRADE_RESULT_STATUSES;

module.exports.ROUNDING_MODES =
  ROUNDING_MODES;
