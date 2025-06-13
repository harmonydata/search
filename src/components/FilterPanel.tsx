"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
  Box,
  Typography,
  Chip,
  Slider,
  TextField,
  Badge,
  Switch,
  Button,
} from "@mui/material";
import Autocomplete from "@mui/material/Autocomplete";
import { FilterAltOff } from "@mui/icons-material";
import { fetchAggregateFilters, AggregateFilter } from "@/services/api";
import FancySlider from "@/components/FancySlider";
import { countryCodes } from "@/config/constants";

// Constants - consolidated at the top level
const DROPDOWN_THRESHOLD = 10; // Threshold to decide when to use a dropdown multiselect

// List of numeric fields that should use range sliders
const NUMERIC_FIELDS = [
  "duration_years",
  "sample_size",
  "age_lower",
  "age_upper",
  "start_year",
  "end_year",
  "num_variables",
  "num_sweeps",
  "age_range",
  "time_range",
];

// Fields that should be grouped under sample characteristics
const CHARACTERISTICS_IDS = [
  "genetic_data",
  "duration_years",
  "sample_size",
  "num_variables",
  "num_sweeps",
];

// Fields that should be hidden from the top level filters
const HIDDEN_FILTERS = [
  "age_lower",
  "age_upper",
  "start_year",
  "end_year",
  "harmony_id",
];

// Mapping for country and language codes
// Create a map from countryCodes array
const countryMap: Record<string, string> = {};
// Initialize country map from imported countryCodes
countryCodes.forEach((country) => {
  countryMap[country.code] = `${country.flag} ${country.name}`;
});

// Add special case for UK (non-standard code that should map to GB)
const gbCountry = countryCodes.find((country) => country.code === "GB");
if (gbCountry) {
  countryMap["UK"] = `${gbCountry.flag} ${gbCountry.name}`;
}

const languageMap: Record<string, string> = {
  en: "English",
  es: "Spanish",
  fr: "French",
  // add more as needed
};

interface FilterPanelProps {
  filtersData?: AggregateFilter[];
  onSelectionChange?: (categoryId: string, selectedOptions: string[]) => void;
  selectedFilters?: Record<string, string[]>;
}

interface ExtendedAggregateFilter extends AggregateFilter {
  subFilters?: AggregateFilter[];
}

// Helper function to format labels nicely (replace underscores with spaces and capitalize)
const formatLabel = (label: string): string => {
  return label
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
};

// Numeric filter component using a range slider
const NumericFilter: React.FC<{
  filter: AggregateFilter;
  onChange: (selected: string[]) => void;
  initialSelected?: string[];
}> = ({ filter, onChange, initialSelected = [] }) => {
  // Better parsing of numeric values from filter options
  const numericValues = filter.options
    .map((o) => {
      const parsed = Number(o);
      return parsed;
    })
    .filter((n) => !isNaN(n) && isFinite(n)); // Filter out NaN and infinity values

  // Handle case with no valid numeric values
  if (numericValues.length === 0) {
    console.warn(
      `No valid numeric values found for filter ${filter.id}, using defaults`
    );

    // Use defaults based on filter id if possible
    let defaultMin = 0;
    let defaultMax = 100;

    if (filter.id === "sample_size" || filter.id.includes("sample_size")) {
      defaultMax = 100000;
    } else if (
      filter.id === "duration_years" ||
      filter.id.includes("duration")
    ) {
      defaultMax = 100;
    } else if (
      filter.id === "num_variables" ||
      filter.id.includes("variables")
    ) {
      defaultMax = 10000;
    } else if (filter.id === "num_sweeps" || filter.id.includes("sweeps")) {
      defaultMax = 50;
    } else if (
      filter.id === "start_year" ||
      filter.id === "end_year" ||
      filter.id.includes("year") ||
      filter.id === "time_range"
    ) {
      defaultMin = 1900;
      defaultMax = 2024;
    } else if (filter.id === "age_range" || filter.id.includes("age")) {
      defaultMax = 100;
    }

    // Check for initial selected values
    let initialMin = defaultMin;
    let initialMax = defaultMax;
    if (initialSelected && initialSelected.length === 2) {
      const [min, max] = initialSelected.map(Number);
      if (!isNaN(min) && isFinite(min)) initialMin = min;
      if (!isNaN(max) && isFinite(max)) initialMax = max;
    }

    // Use these defaults or initial values
    const [value, setValue] = useState<number[]>([initialMin, initialMax]);

    // Update internal state when initialSelected changes
    React.useEffect(() => {
      if (initialSelected && initialSelected.length === 2) {
        const [min, max] = initialSelected.map(Number);
        if (!isNaN(min) && isFinite(min) && !isNaN(max) && isFinite(max)) {
          setValue([min, max]);
        }
      }
    }, [initialSelected]);

    const handleChange = (event: Event, newValue: number | number[]) => {
      if (Array.isArray(newValue)) {
        setValue(newValue);
      }
    };

    const handleChangeCommitted = (
      event: React.SyntheticEvent | Event,
      newValue: number | number[]
    ) => {
      if (Array.isArray(newValue)) {
        onChange([String(newValue[0]), String(newValue[1])]);
      }
    };

    return (
      <Box sx={{ minWidth: 150 }}>
        <FancySlider
          value={value}
          onChange={handleChange}
          onChangeCommitted={handleChangeCommitted}
          valueLabelDisplay="auto"
          min={defaultMin}
          max={defaultMax}
        />
        <Box sx={{ display: "flex", justifyContent: "space-between" }}>
          <Typography variant="caption">{value[0]}</Typography>
          <Typography variant="caption">{value[1]}</Typography>
        </Box>
      </Box>
    );
  }

  // If we have valid numeric values, use them
  // Get min and max from the numeric values
  const min = Math.min(...numericValues);
  const max = Math.max(...numericValues);

  // If min and max are equal, adjust max slightly to create a valid range
  const actualMin = min;
  const actualMax = min === max ? max + 1 : max;

  // Check for initial selected values
  let initialMin = actualMin;
  let initialMax = actualMax;
  if (initialSelected && initialSelected.length === 2) {
    const [min, max] = initialSelected.map(Number);
    if (!isNaN(min) && isFinite(min)) initialMin = min;
    if (!isNaN(max) && isFinite(max)) initialMax = max;
  }

  // Initialize state with the range
  const [value, setValue] = useState<number[]>([initialMin, initialMax]);

  // Update internal state when initialSelected changes
  React.useEffect(() => {
    if (initialSelected && initialSelected.length === 2) {
      const [min, max] = initialSelected.map(Number);
      if (!isNaN(min) && isFinite(min) && !isNaN(max) && isFinite(max)) {
        setValue([min, max]);
      }
    }
  }, [initialSelected]);

  const handleChange = (event: Event, newValue: number | number[]) => {
    if (Array.isArray(newValue)) {
      setValue(newValue);
    }
  };

  const handleChangeCommitted = (
    event: React.SyntheticEvent | Event,
    newValue: number | number[]
  ) => {
    if (Array.isArray(newValue)) {
      onChange([String(newValue[0]), String(newValue[1])]);
    }
  };

  return (
    <Box sx={{ minWidth: 150 }}>
      <FancySlider
        value={value}
        onChange={handleChange}
        onChangeCommitted={handleChangeCommitted}
        valueLabelDisplay="auto"
        min={actualMin}
        max={actualMax}
      />
      <Box sx={{ display: "flex", justifyContent: "space-between" }}>
        <Typography variant="caption">{value[0]}</Typography>
        <Typography variant="caption">{value[1]}</Typography>
      </Box>
    </Box>
  );
};

// Dropdown multi-select filter using Autocomplete
const DropdownFilter: React.FC<{
  filter: AggregateFilter;
  onChange: (selected: string[]) => void;
  mapping?: Record<string, string>;
  initialSelected?: string[];
}> = ({ filter, onChange, mapping, initialSelected = [] }) => {
  const [value, setValue] = useState<string[]>(initialSelected);

  // Update internal state when initialSelected changes
  React.useEffect(() => {
    setValue(initialSelected);
  }, [initialSelected]);

  // Format the options for display
  const getOptionLabel = (option: string) => {
    if (mapping && mapping[option]) {
      return mapping[option];
    }
    // Format option label for better readability
    return formatLabel(option);
  };

  // Filter duplicate options and sort them for country codes
  const filteredOptions = useMemo(() => {
    // Start with filtering out UK when GB is present (they represent the same country)
    let options =
      filter.id === "country_codes"
        ? filter.options.filter(
            (option) => !(option === "UK" && filter.options.includes("GB"))
          )
        : filter.options;

    // Sort by country name if this is a country_codes filter
    if (filter.id === "country_codes" && mapping) {
      options = [...options].sort((a, b) => {
        // Get country names from mapping or use code as fallback
        const nameA = mapping[a] ? mapping[a].split(" ").slice(1).join(" ") : a;
        const nameB = mapping[b] ? mapping[b].split(" ").slice(1).join(" ") : b;
        return nameA.localeCompare(nameB);
      });
    }

    return options;
  }, [filter.options, filter.id, mapping]);

  // Deduplicate display values (for GB/UK special case)
  const displayValue = useMemo(() => {
    if (
      filter.id === "country_codes" &&
      value.includes("GB") &&
      value.includes("UK")
    ) {
      // Remove UK from display values when GB is already selected
      return value.filter((code) => code !== "UK");
    }
    return value;
  }, [filter.id, value]);

  // Handle special case for GB/UK when changing selection
  const handleChange = (event: React.SyntheticEvent, newValue: string[]) => {
    setValue(newValue);

    // Special handling for GB/UK
    if (filter.id === "country_codes") {
      let modifiedSelection = [...newValue];

      // Check if GB was just added (is in newValue but wasn't in value)
      if (newValue.includes("GB") && !value.includes("GB")) {
        // Also add UK if it exists in the original options
        if (
          filter.options.includes("UK") &&
          !modifiedSelection.includes("UK")
        ) {
          modifiedSelection.push("UK");
        }
      }
      // Check if GB was just removed (was in value but isn't in newValue)
      else if (value.includes("GB") && !newValue.includes("GB")) {
        // Also remove UK if it exists in the selection
        modifiedSelection = modifiedSelection.filter((code) => code !== "UK");
      }

      onChange(modifiedSelection);
    } else {
      onChange(newValue);
    }
  };

  return (
    <Autocomplete
      multiple
      freeSolo
      options={filteredOptions}
      getOptionLabel={getOptionLabel}
      value={displayValue}
      onChange={handleChange}
      renderInput={(params) => (
        <TextField
          {...params}
          variant="outlined"
          placeholder={`Select ${filter.label}`}
        />
      )}
    />
  );
};

// Chips filter for small number of options
const ChipsFilter: React.FC<{
  filter: AggregateFilter;
  onChange: (selected: string[]) => void;
  mapping?: Record<string, string>;
  initialSelected?: string[];
}> = ({ filter, onChange, mapping, initialSelected = [] }) => {
  const [selected, setSelected] = useState<string[]>(initialSelected);

  // Update internal state when initialSelected changes
  React.useEffect(() => {
    setSelected(initialSelected);
  }, [initialSelected]);

  // Filter duplicate options and sort them for country codes
  const filteredOptions = useMemo(() => {
    // Start with filtering out UK when GB is present (they represent the same country)
    let options =
      filter.id === "country_codes"
        ? filter.options.filter(
            (option) => !(option === "UK" && filter.options.includes("GB"))
          )
        : filter.options;

    // Sort by country name if this is a country_codes filter
    if (filter.id === "country_codes" && mapping) {
      options = [...options].sort((a, b) => {
        // Get country names from mapping or use code as fallback
        const nameA = mapping[a] ? mapping[a].split(" ").slice(1).join(" ") : a;
        const nameB = mapping[b] ? mapping[b].split(" ").slice(1).join(" ") : b;
        return nameA.localeCompare(nameB);
      });
    }

    return options;
  }, [filter.options, filter.id, mapping]);

  const handleToggle = (option: string) => {
    let newSelected: string[];
    if (selected.includes(option)) {
      newSelected = selected.filter((item) => item !== option);

      // If removing GB, also remove UK
      if (option === "GB" && filter.id === "country_codes") {
        newSelected = newSelected.filter((item) => item !== "UK");
      }
    } else {
      newSelected = [...selected, option];

      // If adding GB, also add UK if it exists in options
      if (
        option === "GB" &&
        filter.id === "country_codes" &&
        filter.options.includes("UK")
      ) {
        if (!newSelected.includes("UK")) {
          newSelected.push("UK");
        }
      }
    }
    setSelected(newSelected);
    onChange(newSelected);
  };

  // Get formatted label for display
  const getLabel = (option: string) => {
    if (mapping && mapping[option]) {
      return mapping[option];
    }
    return formatLabel(option);
  };

  return (
    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
      {filteredOptions.map((option) => (
        <Chip
          key={option}
          label={getLabel(option)}
          color={selected.includes(option) ? "primary" : "default"}
          onClick={() => handleToggle(option)}
        />
      ))}
    </Box>
  );
};

export default function FilterPanel({
  filtersData,
  onSelectionChange,
  selectedFilters: externalSelectedFilters,
}: FilterPanelProps) {
  const [filters, setFilters] = useState<ExtendedAggregateFilter[]>(
    filtersData ? (filtersData as ExtendedAggregateFilter[]) : []
  );
  const [selectedCategory, setSelectedCategory] = useState<string | null>(
    filtersData && filtersData.length > 0 ? filtersData[0].id : null
  );
  const [internalSelectedFilters, setInternalSelectedFilters] = useState<
    Record<string, string[]>
  >({});

  // Use external selectedFilters if provided, otherwise use internal state
  const selectedFilters = externalSelectedFilters || internalSelectedFilters;

  // Update internal state when external filters change
  useEffect(() => {
    if (externalSelectedFilters) {
      setInternalSelectedFilters(externalSelectedFilters);
    }
  }, [externalSelectedFilters]);

  // Track whether initial filters have been set
  const [initialFiltersSet, setInitialFiltersSet] = useState<boolean>(false);

  // Function to reset all filters
  const resetAllFilters = () => {
    // Clear all selected filters
    setInternalSelectedFilters({});

    // Notify parent component
    if (onSelectionChange) {
      // Get all filter keys currently in use
      const allFilterKeys = Object.keys(selectedFilters);

      // Clear each filter individually
      allFilterKeys.forEach((key) => {
        // For special case filters like age_range that map to multiple API parameters
        if (key === "sample_characteristics#age_range") {
          onSelectionChange("age_min", []);
          onSelectionChange("age_max", []);
        } else if (key === "sample_characteristics#time_range") {
          onSelectionChange("start_year", []);
          onSelectionChange("end_year", []);
        } else if (
          key.includes("#") &&
          NUMERIC_FIELDS.includes(key.split("#")[1])
        ) {
          // For numeric fields, clear both min and max
          const filterId = key.split("#")[1];
          onSelectionChange(`${filterId}_min`, []);
          onSelectionChange(`${filterId}_max`, []);
        } else if (key.includes("#")) {
          // For sub-filters, extract and clear the actual filter ID
          const filterId = key.split("#")[1];
          onSelectionChange(filterId, []);
        } else {
          // For top-level filters
          onSelectionChange(key, []);
        }
      });
    }
  };

  // Process data once when filters are loaded
  React.useEffect(() => {
    // Only process and set filters if they haven't been set yet
    // or if filtersData has changed AND we haven't set any filters yet
    if (!initialFiltersSet && filtersData && filtersData.length > 0) {
      // First, filter out hidden filters
      let filtersCopy = [...filtersData].filter(
        (f) => !HIDDEN_FILTERS.includes(f.id)
      );

      // Extract the filters that should be grouped under "Sample Characteristics"
      const subFilters = filtersCopy.filter((f) =>
        CHARACTERISTICS_IDS.includes(f.id)
      );

      // Process filters to create both age_range and time_range combined filters
      const updatedSubFilters = [...subFilters]; // Start with a copy of all subfilters

      // Get the age_lower and age_upper filters from the original filtersData (not filtersCopy)
      // since we've already filtered them out from filtersCopy
      const ageLowerFilter = filtersData.find((f) => f.id === "age_lower");
      const ageUpperFilter = filtersData.find((f) => f.id === "age_upper");

      // Create a combined age range filter if both age_lower and age_upper exist
      if (ageLowerFilter && ageUpperFilter) {
        // Get numeric values from both filters
        const ageLowerValues = ageLowerFilter.options
          .map((o) => Number(o))
          .filter((n) => !isNaN(n) && isFinite(n));

        const ageUpperValues = ageUpperFilter.options
          .map((o) => Number(o))
          .filter((n) => !isNaN(n) && isFinite(n));

        // Calculate the actual min and max for the combined range
        const minAge =
          ageLowerValues.length > 0 ? Math.min(...ageLowerValues) : 0;
        const maxAge =
          ageUpperValues.length > 0 ? Math.max(...ageUpperValues) : 100;

        // Create a new combined age range filter with proper min/max values
        const combinedAgeFilter: AggregateFilter = {
          id: "age_range",
          label: "Age Range",
          options: [String(minAge), String(maxAge)],
        };

        // Add the combined filter to updated subfilters
        updatedSubFilters.push(combinedAgeFilter);
      }

      // Get the start_year and end_year filters from the original filtersData
      const startYearFilter = filtersData.find((f) => f.id === "start_year");
      const endYearFilter = filtersData.find((f) => f.id === "end_year");

      // Create a combined time range filter if both start_year and end_year exist
      if (startYearFilter && endYearFilter) {
        // Get numeric values from both filters
        const startYearValues = startYearFilter.options
          .map((o) => Number(o))
          .filter((n) => !isNaN(n) && isFinite(n));

        const endYearValues = endYearFilter.options
          .map((o) => Number(o))
          .filter((n) => !isNaN(n) && isFinite(n));

        // Calculate the actual min and max for the combined range
        const minYear =
          startYearValues.length > 0 ? Math.min(...startYearValues) : 1900;
        const maxYear =
          endYearValues.length > 0 ? Math.max(...endYearValues) : 2024;

        // Create a new combined time range filter with proper min/max values
        const combinedTimeFilter: AggregateFilter = {
          id: "time_range",
          label: "Time Coverage",
          options: [String(minYear), String(maxYear)],
        };

        // Add the combined filter to updated subfilters
        updatedSubFilters.push(combinedTimeFilter);
      }

      // Filter out the characteristics IDs from the main filter list
      // We need to do this again to make sure all CHARACTERISTICS_IDS are removed
      filtersCopy = filtersCopy.filter(
        (f) => !CHARACTERISTICS_IDS.includes(f.id)
      );

      // Add the Sample Characteristics filter with updated subfilters
      filtersCopy.push({
        id: "sample_characteristics",
        label: "Sample Characteristics",
        options: [],
        subFilters: updatedSubFilters,
      } as ExtendedAggregateFilter);

      setFilters(filtersCopy as ExtendedAggregateFilter[]);
      if (!selectedCategory && filtersCopy.length > 0) {
        setSelectedCategory(filtersCopy[0].id);
      }

      // Mark initial filters as set
      setInitialFiltersSet(true);
      console.log("Initial filters set with", filtersCopy.length, "categories");
    } else if (
      !initialFiltersSet &&
      (!filtersData || filtersData.length === 0)
    ) {
      // If filtersData prop is not provided and we haven't set filters yet, fetch from API
      fetchAggregateFilters()
        .then((data) => {
          // First, filter out hidden filters
          let filtersCopy = data.filter((f) => !HIDDEN_FILTERS.includes(f.id));

          // Extract the filters that should be grouped under "Sample Characteristics"
          const subFilters = filtersCopy.filter((f) =>
            CHARACTERISTICS_IDS.includes(f.id)
          );

          // Process filters to create both age_range and time_range combined filters
          const updatedSubFilters = [...subFilters]; // Start with a copy of all subfilters

          // Get the age_lower and age_upper filters from the original data
          const ageLowerFilter = data.find((f) => f.id === "age_lower");
          const ageUpperFilter = data.find((f) => f.id === "age_upper");

          // Create a combined age range filter if both age_lower and age_upper exist
          if (ageLowerFilter && ageUpperFilter) {
            // Get numeric values from both filters
            const ageLowerValues = ageLowerFilter.options
              .map((o) => Number(o))
              .filter((n) => !isNaN(n) && isFinite(n));

            const ageUpperValues = ageUpperFilter.options
              .map((o) => Number(o))
              .filter((n) => !isNaN(n) && isFinite(n));

            // Calculate the actual min and max for the combined range
            const minAge =
              ageLowerValues.length > 0 ? Math.min(...ageLowerValues) : 0;
            const maxAge =
              ageUpperValues.length > 0 ? Math.max(...ageUpperValues) : 100;

            // Create a new combined age range filter with proper min/max values
            const combinedAgeFilter: AggregateFilter = {
              id: "age_range",
              label: "Age Range",
              options: [String(minAge), String(maxAge)],
            };

            // Add the combined filter to updated subfilters
            updatedSubFilters.push(combinedAgeFilter);
          }

          // Get the start_year and end_year filters from the original data
          const startYearFilter = data.find((f) => f.id === "start_year");
          const endYearFilter = data.find((f) => f.id === "end_year");

          // Create a combined time range filter if both start_year and end_year exist
          if (startYearFilter && endYearFilter) {
            // Get numeric values from both filters
            const startYearValues = startYearFilter.options
              .map((o) => Number(o))
              .filter((n) => !isNaN(n) && isFinite(n));

            const endYearValues = endYearFilter.options
              .map((o) => Number(o))
              .filter((n) => !isNaN(n) && isFinite(n));

            // Calculate the actual min and max for the combined range
            const minYear =
              startYearValues.length > 0 ? Math.min(...startYearValues) : 1900;
            const maxYear =
              endYearValues.length > 0 ? Math.max(...endYearValues) : 2024;

            // Create a new combined time range filter with proper min/max values
            const combinedTimeFilter: AggregateFilter = {
              id: "time_range",
              label: "Time Coverage",
              options: [String(minYear), String(maxYear)],
            };

            // Add the combined filter to updated subfilters
            updatedSubFilters.push(combinedTimeFilter);
          }

          // Filter out the characteristics IDs from the main filter list
          // We need to do this again to make sure all CHARACTERISTICS_IDS are removed
          filtersCopy = filtersCopy.filter(
            (f) => !CHARACTERISTICS_IDS.includes(f.id)
          );

          // Add the Sample Characteristics filter with updated subfilters
          filtersCopy.push({
            id: "sample_characteristics",
            label: "Sample Characteristics",
            options: [],
            subFilters: updatedSubFilters,
          } as ExtendedAggregateFilter);

          setFilters(filtersCopy as ExtendedAggregateFilter[]);
          if (filtersCopy.length > 0 && !selectedCategory) {
            setSelectedCategory(filtersCopy[0].id);
          }

          // Mark initial filters as set
          setInitialFiltersSet(true);
          console.log(
            "Initial filters set from API with",
            filtersCopy.length,
            "categories"
          );
        })
        .catch((error) => {
          console.error("Error fetching aggregate filters:", error);
        });
    }
    // Remove the dependency on filtersData so it doesn't re-run when prop changes
    // Only respond to changes in initialFiltersSet state
  }, [initialFiltersSet, selectedCategory]);

  // Handle special case of time_range filter when user selects a range
  const handleFilterSelection = (
    categoryId: string,
    selectedOptions: string[]
  ) => {
    // Handle numeric range filters with min/max parameters
    if (categoryId.includes("#") && categoryId.split("#")[1]) {
      const [parentId, filterId] = categoryId.split("#");

      // Check if this is a numeric field that should use min/max parameters
      const isNumericField = NUMERIC_FIELDS.includes(filterId);

      if (isNumericField && selectedOptions.length === 2) {
        const [minValue, maxValue] = selectedOptions.map(Number);

        // Find the original filter to check if this is the full range
        const parentFilter = filters.find((f) => f.id === parentId);
        const numericFilter = parentFilter?.subFilters?.find(
          (f) => f.id === filterId
        );

        if (numericFilter) {
          const fullRangeValues = numericFilter.options
            .map((o) => Number(o))
            .filter((n) => !isNaN(n) && isFinite(n));

          const originalMin =
            fullRangeValues.length > 0 ? Math.min(...fullRangeValues) : 0;
          const originalMax =
            fullRangeValues.length > 0 ? Math.max(...fullRangeValues) : 100;

          // Only set the filters if the user has actually filtered (not at full range)
          const isFullRange =
            minValue <= originalMin + 0.1 && maxValue >= originalMax - 0.1;

          if (!isFullRange) {
            // Handle special cases
            if (filterId === "age_range") {
              // Age range is a special case that maps to age_min and age_max parameters
              if (onSelectionChange) {
                onSelectionChange("age_min", [String(minValue)]);
                onSelectionChange("age_max", [String(maxValue)]);
              }

              // Update local state
              setInternalSelectedFilters((prev) => ({
                ...prev,
                age_min: [String(minValue)],
                age_max: [String(maxValue)],
                [categoryId]: selectedOptions,
              }));
            } else if (filterId === "time_range") {
              // Time range maps to start_year and end_year
              if (onSelectionChange) {
                onSelectionChange("start_year", [String(minValue)]);
                onSelectionChange("end_year", [String(maxValue)]);
              }

              // Update local state
              setInternalSelectedFilters((prev) => ({
                ...prev,
                start_year: [String(minValue)],
                end_year: [String(maxValue)],
                [categoryId]: selectedOptions,
              }));
            } else {
              // For all other numeric fields, use {field}_min and {field}_max pattern
              const minParamName = `${filterId}_min`;
              const maxParamName = `${filterId}_max`;

              if (onSelectionChange) {
                onSelectionChange(minParamName, [String(minValue)]);
                onSelectionChange(maxParamName, [String(maxValue)]);
              }

              // Update local state
              setInternalSelectedFilters((prev) => ({
                ...prev,
                [minParamName]: [String(minValue)],
                [maxParamName]: [String(maxValue)],
                [categoryId]: selectedOptions,
              }));
            }
          } else {
            // Clear the filters if at full range
            if (filterId === "age_range") {
              if (onSelectionChange) {
                onSelectionChange("age_min", []);
                onSelectionChange("age_max", []);
              }

              // Update local state
              setInternalSelectedFilters((prev) => {
                const newState = { ...prev };
                delete newState["age_min"];
                delete newState["age_max"];
                return {
                  ...newState,
                  [categoryId]: selectedOptions,
                };
              });
            } else if (filterId === "time_range") {
              if (onSelectionChange) {
                onSelectionChange("start_year", []);
                onSelectionChange("end_year", []);
              }

              // Update local state
              setInternalSelectedFilters((prev) => {
                const newState = { ...prev };
                delete newState["start_year"];
                delete newState["end_year"];
                return {
                  ...newState,
                  [categoryId]: selectedOptions,
                };
              });
            } else {
              // For all other numeric fields
              const minParamName = `${filterId}_min`;
              const maxParamName = `${filterId}_max`;

              if (onSelectionChange) {
                onSelectionChange(minParamName, []);
                onSelectionChange(maxParamName, []);
              }

              // Update local state
              setInternalSelectedFilters((prev) => {
                const newState = { ...prev };
                delete newState[minParamName];
                delete newState[maxParamName];
                return {
                  ...newState,
                  [categoryId]: selectedOptions,
                };
              });
            }
          }
          return; // Exit after handling the numeric field
        }
      }
    }

    // Handle regular filters that aren't numeric ranges
    if (categoryId.includes("#")) {
      const [parentId, filterId] = categoryId.split("#");

      // If this isn't a numeric field or special case, just pass the values directly
      setInternalSelectedFilters((prev) => ({
        ...prev,
        [categoryId]: selectedOptions,
      }));

      if (onSelectionChange) {
        onSelectionChange(filterId, selectedOptions);
      }
    } else {
      // For top-level filters (not within a category)
      setInternalSelectedFilters((prev) => ({
        ...prev,
        [categoryId]: selectedOptions,
      }));

      if (onSelectionChange) {
        onSelectionChange(categoryId, selectedOptions);
      }
    }
  };

  const handleCategoryClick = (categoryId: string) => {
    setSelectedCategory(categoryId);
  };

  const activeFilter = filters.find((filter) => filter.id === selectedCategory);

  // Process the active filter options if it exists
  const processedOptions =
    activeFilter?.id === "source"
      ? activeFilter.options.filter((option) => !option.includes(" "))
      : activeFilter?.options;

  return (
    <Box>
      {/* Top row: filter categories as chips with badge showing number of selections and reset button */}
      <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", flex: 1 }}>
          {filters.map((filter) => (
            <Badge
              key={filter.id}
              badgeContent={
                filter.subFilters
                  ? // Sum selections for merged filter using keys like 'sample_characteristics#subFilterId'
                    Object.keys(selectedFilters)
                      .filter((key) => key.startsWith(filter.id + "#"))
                      .reduce(
                        (acc, key) => acc + (selectedFilters[key]?.length || 0),
                        0
                      )
                  : selectedFilters[filter.id]?.length || 0
              }
              color="primary"
            >
              <Chip
                label={formatLabel(filter.label)}
                onClick={() => handleCategoryClick(filter.id)}
                variant={filter.id === selectedCategory ? "filled" : "outlined"}
                color={filter.id === selectedCategory ? "primary" : "default"}
              />
            </Badge>
          ))}
        </Box>

        {/* Only show reset button if there are active filters */}
        {Object.keys(selectedFilters).length > 0 && (
          <Button
            onClick={resetAllFilters}
            variant="contained"
            color="secondary"
            sx={{
              minWidth: 0,
              width: 40,
              height: 40,
              borderRadius: "50%",
              p: 0,
            }}
          >
            <FilterAltOff />
          </Button>
        )}
      </Box>

      {/* Second row: subordinate filter for the selected category */}
      {activeFilter && (
        <Box sx={{ mb: 2 }}>
          {activeFilter.subFilters ? (
            // Merged filter rendering in a flex row with wrapping and padding
            <Box
              sx={{
                display: "flex",
                gap: 3, // Increased gap between items
                flexWrap: "wrap", // Allow wrapping
                width: "100%",
              }}
            >
              {activeFilter.subFilters.map((sub: AggregateFilter) => {
                const key = `${activeFilter.id}#${sub.id}`;
                const currentSelection = selectedFilters[key] || [];
                let component = null;

                // Format the filter label nicely
                const displayLabel = formatLabel(sub.label || sub.id);

                // Handle different filter types
                if (
                  sub.options.length === 2 &&
                  sub.options.includes("0") &&
                  sub.options.includes("1")
                ) {
                  // Render binary as a toggle switch
                  component = (
                    <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                      <Switch
                        checked={currentSelection[0] === "1"}
                        onChange={(e) => {
                          const newValue = e.target.checked ? ["1"] : ["0"];
                          handleFilterSelection(key, newValue);
                        }}
                      />
                    </Box>
                  );
                } else if (NUMERIC_FIELDS.includes(sub.id)) {
                  component = (
                    <NumericFilter
                      filter={sub}
                      onChange={(selected) => {
                        handleFilterSelection(key, selected);
                      }}
                      initialSelected={selectedFilters[key] || []}
                    />
                  );
                } else if (
                  sub.options &&
                  sub.options.length > DROPDOWN_THRESHOLD
                ) {
                  let mapping: Record<string, string> | undefined;
                  if (sub.id === "country_codes") mapping = countryMap;
                  else if (sub.id === "language_codes") mapping = languageMap;
                  component = (
                    <DropdownFilter
                      filter={sub}
                      onChange={(selected) => {
                        handleFilterSelection(key, selected);
                      }}
                      mapping={mapping}
                      initialSelected={selectedFilters[key] || []}
                    />
                  );
                } else {
                  let mapping: Record<string, string> | undefined;
                  if (sub.id === "country_codes") mapping = countryMap;
                  else if (sub.id === "language_codes") mapping = languageMap;
                  component = (
                    <ChipsFilter
                      filter={sub}
                      onChange={(selected) => {
                        handleFilterSelection(key, selected);
                      }}
                      mapping={mapping}
                      initialSelected={selectedFilters[key] || []}
                    />
                  );
                }
                return (
                  <Box
                    key={sub.id}
                    sx={{
                      flex: "1 0 200px", // Min width of 200px, can grow but not shrink
                      mb: 2, // Bottom margin for wrapped items
                      px: 1, // Horizontal padding
                    }}
                  >
                    <Typography variant="subtitle2" gutterBottom>
                      {displayLabel}
                    </Typography>
                    {component}
                  </Box>
                );
              })}
            </Box>
          ) : activeFilter.options.length === 2 &&
            activeFilter.options.includes("0") &&
            activeFilter.options.includes("1") ? (
            // Non-merged binary filter rendered as a toggle switch
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <Typography
                variant="subtitle2"
                gutterBottom
                sx={{ minWidth: 150 }}
              >
                {formatLabel(activeFilter.label)}
              </Typography>
              <Switch
                checked={selectedFilters[activeFilter.id]?.[0] === "1"}
                onChange={(e) => {
                  const newValue = e.target.checked ? ["1"] : ["0"];
                  handleFilterSelection(activeFilter.id, newValue);
                }}
              />
            </Box>
          ) : NUMERIC_FIELDS.includes(activeFilter.id) ? (
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                {formatLabel(activeFilter.label)}
              </Typography>
              <NumericFilter
                filter={activeFilter}
                onChange={(selected) => {
                  handleFilterSelection(activeFilter.id, selected);
                }}
                initialSelected={selectedFilters[activeFilter.id] || []}
              />
            </Box>
          ) : processedOptions &&
            processedOptions.length > DROPDOWN_THRESHOLD ? (
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                {formatLabel(activeFilter.label)}
              </Typography>
              <DropdownFilter
                filter={{
                  ...activeFilter,
                  options: processedOptions,
                }}
                onChange={(selected) =>
                  handleFilterSelection(activeFilter.id, selected)
                }
                mapping={
                  activeFilter.id === "country_codes"
                    ? countryMap
                    : activeFilter.id === "language_codes"
                    ? languageMap
                    : undefined
                }
                initialSelected={selectedFilters[activeFilter.id] || []}
              />
            </Box>
          ) : (
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                {formatLabel(activeFilter.label)}
              </Typography>
              <ChipsFilter
                filter={{
                  ...activeFilter,
                  options: processedOptions || [],
                }}
                onChange={(selected) =>
                  handleFilterSelection(activeFilter.id, selected)
                }
                mapping={
                  activeFilter.id === "country_codes"
                    ? countryMap
                    : activeFilter.id === "language_codes"
                    ? languageMap
                    : undefined
                }
                initialSelected={selectedFilters[activeFilter.id] || []}
              />
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
}
