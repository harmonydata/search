"use client";

import React, { useState } from "react";
import {
  Box,
  Typography,
  Chip,
  Slider,
  TextField,
  Badge,
  Switch,
} from "@mui/material";
import Autocomplete from "@mui/material/Autocomplete";
import { fetchAggregateFilters, AggregateFilter } from "@/services/api";
import FancySlider from "@/components/FancySlider";

interface FilterPanelProps {
  filtersData?: AggregateFilter[];
  onSelectionChange?: (categoryId: string, selectedOptions: string[]) => void;
}

// Mapping for country and language codes
const countryMap: Record<string, string> = {
  GB: "United Kingdom",
  US: "United States",
  CA: "Canada",
  // add more as needed
};

const languageMap: Record<string, string> = {
  en: "English",
  es: "Spanish",
  fr: "French",
  // add more as needed
};

// Threshold to decide when to use a dropdown multiselect
const DROPDOWN_THRESHOLD = 10;

// List of numeric fields that should use range sliders
const numericFields = [
  'duration_years',
  'sample_size',
  'age_lower',
  'age_upper',
  'start_year',
  'end_year',
  'num_variables',
  'num_sweeps',
  'age_range'
];

interface ExtendedAggregateFilter extends AggregateFilter {
  subFilters?: AggregateFilter[];
}

// Numeric filter component using a range slider
const NumericFilter: React.FC<{
  filter: AggregateFilter;
  onChange: (selected: string[]) => void;
}> = ({ filter, onChange }) => {
  // Better parsing of numeric values from filter options
  const numericValues = filter.options
    .map((o) => {
      const parsed = Number(o);
      return parsed;
    })
    .filter((n) => !isNaN(n) && isFinite(n)); // Filter out NaN and infinity values
  
  // Handle case with no valid numeric values
  if (numericValues.length === 0) {
    console.warn(`No valid numeric values found for filter ${filter.id}, using defaults`);
    
    // Use defaults based on filter id if possible
    let defaultMin = 0;
    let defaultMax = 100;
    
    if (filter.id === "sample_size" || filter.id.includes("sample_size")) {
      defaultMax = 100000;
    } else if (filter.id === "duration_years" || filter.id.includes("duration")) {
      defaultMax = 100;
    } else if (filter.id === "num_variables" || filter.id.includes("variables")) {
      defaultMax = 10000;
    } else if (filter.id === "num_sweeps" || filter.id.includes("sweeps")) {
      defaultMax = 50;
    } else if (filter.id === "start_year" || filter.id === "end_year" || 
               filter.id.includes("year")) {
      defaultMin = 1900;
      defaultMax = 2024;
    } else if (filter.id === "age_range" || filter.id.includes("age")) {
      defaultMax = 100;
    }
    
    // Use these defaults
    const [value, setValue] = useState<number[]>([defaultMin, defaultMax]);
    
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
  
  // Initialize state with the full range
  const [value, setValue] = useState<number[]>([actualMin, actualMax]);

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
}> = ({ filter, onChange, mapping }) => {
  const [value, setValue] = useState<string[]>([]);

  return (
    <Autocomplete
      multiple
      options={filter.options}
      getOptionLabel={(option) =>
        mapping ? mapping[option] || option : option
      }
      value={value}
      onChange={(event, newValue) => {
        setValue(newValue);
        onChange(newValue);
      }}
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
}> = ({ filter, onChange, mapping }) => {
  const [selected, setSelected] = useState<string[]>([]);

  const handleToggle = (option: string) => {
    let newSelected: string[];
    if (selected.includes(option)) {
      newSelected = selected.filter((item) => item !== option);
    } else {
      newSelected = [...selected, option];
    }
    setSelected(newSelected);
    onChange(newSelected);
  };

  return (
    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
      {filter.options.map((option) => (
        <Chip
          key={option}
          label={mapping ? mapping[option] || option : option}
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
}: FilterPanelProps) {
  const [filters, setFilters] = useState<ExtendedAggregateFilter[]>(
    filtersData ? (filtersData as ExtendedAggregateFilter[]) : []
  );
  const [selectedCategory, setSelectedCategory] = useState<string | null>(
    filtersData && filtersData.length > 0 ? filtersData[0].id : null
  );
  const [selectedFilters, setSelectedFilters] = useState<
    Record<string, string[]>
  >({});

  React.useEffect(() => {
    if (filtersData && filtersData.length > 0) {
      let filtersCopy = [...filtersData];
      
      // List of filter IDs that should be grouped under "Sample Characteristics"
      const characteristicsIds = [
        "genetic_data",
        "study_design",
        "duration_years",
        "sample_size",
        "age_lower",
        "age_upper",
        "num_variables",
        "num_sweeps",
        "start_year",
        "end_year"
      ];
      
      // Extract the filters that should be grouped under "Sample Characteristics"
      const subFilters = filtersCopy.filter((f) =>
        characteristicsIds.includes(f.id)
      );
      
      // Create a combined age range filter if both age_lower and age_upper exist
      const ageLowerFilter = subFilters.find(f => f.id === "age_lower");
      const ageUpperFilter = subFilters.find(f => f.id === "age_upper");
      
      if (ageLowerFilter && ageUpperFilter) {
        // Remove individual age filters
        const nonAgeSubFilters = subFilters.filter(f => f.id !== "age_lower" && f.id !== "age_upper");
        
        // Get numeric values from both filters
        const ageLowerValues = ageLowerFilter.options
          .map(o => Number(o))
          .filter(n => !isNaN(n) && isFinite(n));
          
        const ageUpperValues = ageUpperFilter.options
          .map(o => Number(o))
          .filter(n => !isNaN(n) && isFinite(n));
        
        // Calculate the actual min and max for the combined range
        const minAge = ageLowerValues.length > 0 ? Math.min(...ageLowerValues) : 0;
        const maxAge = ageUpperValues.length > 0 ? Math.max(...ageUpperValues) : 100;
        
        // Create a new combined age range filter with proper min/max values
        const combinedAgeFilter: AggregateFilter = {
          id: "age_range",
          label: "Age Range",
          options: [
            String(minAge),
            String(maxAge)
          ]
        };
        
        // Add the combined filter to subFilters
        const updatedSubFilters = [...nonAgeSubFilters, combinedAgeFilter];
        
        // Filter out the characteristics IDs from the main filter list
        filtersCopy = filtersCopy.filter(
          (f) => !characteristicsIds.includes(f.id)
        );
        
        // Add the Sample Characteristics filter with subfilters
        filtersCopy.push({
          id: "sample_characteristics",
          label: "Sample Characteristics",
          options: [],
          subFilters: updatedSubFilters,
        } as ExtendedAggregateFilter);
      } else if (subFilters.length > 0) {
        // If we don't have both age filters, just add the regular subfilters
        filtersCopy = filtersCopy.filter(
          (f) => !characteristicsIds.includes(f.id)
        );
        filtersCopy.push({
          id: "sample_characteristics",
          label: "Sample Characteristics",
          options: [],
          subFilters,
        } as ExtendedAggregateFilter);
      }
      
      setFilters(filtersCopy as ExtendedAggregateFilter[]);
      if (!selectedCategory && filtersCopy.length > 0) {
        setSelectedCategory(filtersCopy[0].id);
      }
    } else {
      // If filtersData prop is not provided, fetch from API
      fetchAggregateFilters()
        .then((data) => {
          let filtersCopy = [...data];
          const characteristicsIds = [
            "genetic_data",
            "study_design",
            "duration_years",
            "sample_size",
            "age_lower",
            "age_upper",
            "num_variables",
            "num_sweeps",
            "start_year",
            "end_year"
          ];
          const subFilters = filtersCopy.filter((f) =>
            characteristicsIds.includes(f.id)
          );
          
          // Create a combined age range filter if both age_lower and age_upper exist
          const ageLowerFilter = subFilters.find(f => f.id === "age_lower");
          const ageUpperFilter = subFilters.find(f => f.id === "age_upper");
          
          if (ageLowerFilter && ageUpperFilter) {
            // Remove individual age filters
            const nonAgeSubFilters = subFilters.filter(f => f.id !== "age_lower" && f.id !== "age_upper");
            
            // Get numeric values from both filters
            const ageLowerValues = ageLowerFilter.options
              .map(o => Number(o))
              .filter(n => !isNaN(n) && isFinite(n));
              
            const ageUpperValues = ageUpperFilter.options
              .map(o => Number(o))
              .filter(n => !isNaN(n) && isFinite(n));
            
            // Calculate the actual min and max for the combined range
            const minAge = ageLowerValues.length > 0 ? Math.min(...ageLowerValues) : 0;
            const maxAge = ageUpperValues.length > 0 ? Math.max(...ageUpperValues) : 100;
            
            // Create a new combined age range filter with proper min/max values
            const combinedAgeFilter: AggregateFilter = {
              id: "age_range",
              label: "Age Range",
              options: [
                String(minAge),
                String(maxAge)
              ]
            };
            
            // Add the combined filter to subFilters
            const updatedSubFilters = [...nonAgeSubFilters, combinedAgeFilter];
            
            filtersCopy = filtersCopy.filter(
              (f) => !characteristicsIds.includes(f.id)
            );
            filtersCopy.push({
              id: "sample_characteristics",
              label: "Sample Characteristics",
              options: [],
              subFilters: updatedSubFilters,
            } as ExtendedAggregateFilter);
          } else if (subFilters.length > 0) {
            filtersCopy = filtersCopy.filter(
              (f) => !characteristicsIds.includes(f.id)
            );
            filtersCopy.push({
              id: "sample_characteristics",
              label: "Sample Characteristics",
              options: [],
              subFilters,
            } as ExtendedAggregateFilter);
          }
          
          setFilters(filtersCopy as ExtendedAggregateFilter[]);
          if (filtersCopy.length > 0 && !selectedCategory) {
            setSelectedCategory(filtersCopy[0].id);
          }
        })
        .catch((error) => {
          console.error("Error fetching aggregate filters:", error);
        });
    }
  }, [filtersData, selectedCategory]);

  // Handle special case of age_range filter when user selects a range
  const handleFilterSelection = (categoryId: string, selectedOptions: string[]) => {
    // If this is the age_range filter, we need to set both age_min and age_max
    // (API uses age_min/age_max for search but returns age_lower/age_upper in aggregations)
    if (categoryId === "sample_characteristics#age_range") {
      if (selectedOptions.length === 2) {
        const [minAge, maxAge] = selectedOptions.map(Number);
        
        // Find the original age filter to check if this is the full range
        const sampleCharacteristicsFilter = filters.find(f => f.id === "sample_characteristics");
        const ageRangeFilter = sampleCharacteristicsFilter?.subFilters?.find(f => f.id === "age_range");
        
        if (ageRangeFilter) {
          const fullRangeValues = ageRangeFilter.options
            .map(o => Number(o))
            .filter(n => !isNaN(n) && isFinite(n));
          
          const originalMin = fullRangeValues.length > 0 ? Math.min(...fullRangeValues) : 0;
          const originalMax = fullRangeValues.length > 0 ? Math.max(...fullRangeValues) : 100;
          
          // Only set the filters if the user has actually filtered (not at full range)
          const isFullRange = minAge <= originalMin + 0.1 && maxAge >= originalMax - 0.1;
          
          if (!isFullRange) {
            // Set age_min and age_max for API (not age_lower and age_upper)
            if (onSelectionChange) {
              onSelectionChange("age_min", [String(minAge)]);
              onSelectionChange("age_max", [String(maxAge)]);
            }
            
            // Update local state
            setSelectedFilters(prev => ({
              ...prev,
              "age_min": [String(minAge)],
              "age_max": [String(maxAge)],
              [categoryId]: selectedOptions
            }));
          } else {
            // Clear the filters if at full range
            if (onSelectionChange) {
              onSelectionChange("age_min", []);
              onSelectionChange("age_max", []);
            }
            
            // Update local state - remove the filters
            setSelectedFilters(prev => {
              const newState = { ...prev };
              delete newState["age_min"];
              delete newState["age_max"];
              return {
                ...newState,
                [categoryId]: selectedOptions
              };
            });
          }
        }
      }
    } else if (categoryId.includes("#") && categoryId.split("#")[1] && numericFields.includes(categoryId.split("#")[1])) {
      // For other numeric fields, check if they're at their full range
      const [parentId, filterId] = categoryId.split("#");
      
      if (selectedOptions.length === 2) {
        const [minValue, maxValue] = selectedOptions.map(Number);
        
        // Find the original filter to check if this is the full range
        const parentFilter = filters.find(f => f.id === parentId);
        const numericFilter = parentFilter?.subFilters?.find(f => f.id === filterId);
        
        if (numericFilter) {
          const fullRangeValues = numericFilter.options
            .map(o => Number(o))
            .filter(n => !isNaN(n) && isFinite(n));
          
          const originalMin = fullRangeValues.length > 0 ? Math.min(...fullRangeValues) : 0;
          const originalMax = fullRangeValues.length > 0 ? Math.max(...fullRangeValues) : 100;
          
          // Only set the filter if the user has actually filtered (not at full range)
          const isFullRange = minValue <= originalMin + 0.1 && maxValue >= originalMax - 0.1;
          
          if (!isFullRange) {
            // Handle regular filter selection
            setSelectedFilters(prev => ({
              ...prev,
              [filterId]: selectedOptions,
              [categoryId]: selectedOptions
            }));
            
            if (onSelectionChange) {
              onSelectionChange(filterId, selectedOptions);
            }
          } else {
            // Clear the filter if at full range
            setSelectedFilters(prev => {
              const newState = { ...prev };
              delete newState[filterId];
              return {
                ...newState,
                [categoryId]: selectedOptions
              };
            });
            
            if (onSelectionChange) {
              onSelectionChange(filterId, []);
            }
          }
        }
      }
    } else {
      // Handle regular filter selection
      setSelectedFilters(prev => ({
        ...prev,
        [categoryId]: selectedOptions
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
  let subordinateElement = null;
  if (activeFilter) {
    // Define the numeric fields that should use the range slider
    const numericFields = [
      'duration_years',
      'sample_size',
      'age_lower',
      'age_upper',
      'start_year',
      'end_year',
      'num_variables',
      'num_sweeps'
    ];
    
    if (numericFields.includes(activeFilter.id)) {
      subordinateElement = (
        <NumericFilter
          filter={activeFilter}
          onChange={(selected) =>
            handleFilterSelection(activeFilter.id, selected)
          }
        />
      );
    } else if (activeFilter.options.length > DROPDOWN_THRESHOLD) {
      let mapping: Record<string, string> | undefined;
      if (activeFilter.id === "country_codes") mapping = countryMap;
      else if (activeFilter.id === "language_codes") mapping = languageMap;
      subordinateElement = (
        <DropdownFilter
          filter={activeFilter}
          onChange={(selected) =>
            handleFilterSelection(activeFilter.id, selected)
          }
          mapping={mapping}
        />
      );
    } else {
      let mapping: Record<string, string> | undefined;
      if (activeFilter.id === "country_codes") mapping = countryMap;
      else if (activeFilter.id === "language_codes") mapping = languageMap;
      subordinateElement = (
        <ChipsFilter
          filter={activeFilter}
          onChange={(selected) =>
            handleFilterSelection(activeFilter.id, selected)
          }
          mapping={mapping}
        />
      );
    }
  }

  return (
    <Box>
      {/* Top row: filter categories as chips with badge showing number of selections */}
      <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mb: 2 }}>
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
              label={filter.label}
              onClick={() => handleCategoryClick(filter.id)}
              variant={filter.id === selectedCategory ? "filled" : "outlined"}
              color={filter.id === selectedCategory ? "primary" : "default"}
            />
          </Badge>
        ))}
      </Box>
      {/* Second row: subordinate filter for the selected category */}
      {activeFilter && (
        <Box sx={{ mb: 2 }}>
          {activeFilter.subFilters ? (
            // Merged filter rendering in a flex row with wrapping and padding
            <Box
              sx={{
                display: "flex", 
                gap: 3,  // Increased gap between items
                flexWrap: "wrap",  // Allow wrapping
                width: "100%",
              }}
            >
              {activeFilter.subFilters.map((sub: AggregateFilter) => {
                const key = `${activeFilter.id}#${sub.id}`;
                const currentSelection = selectedFilters[key] || [];
                let component = null;
                
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
                } else if (
                  sub.id === "duration_years" ||
                  sub.id === "sample_size" ||
                  sub.id === "age_range" ||
                  numericFields.includes(sub.id)
                ) {
                  component = (
                    <NumericFilter
                      filter={sub}
                      onChange={(selected) => {
                        handleFilterSelection(key, selected);
                      }}
                    />
                  );
                } else if (sub.options.length > DROPDOWN_THRESHOLD) {
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
                      {sub.label}
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
              <Switch
                checked={selectedFilters[activeFilter.id]?.[0] === "1"}
                onChange={(e) => {
                  const newValue = e.target.checked ? ["1"] : ["0"];
                  handleFilterSelection(activeFilter.id, newValue);
                }}
              />
            </Box>
          ) : numericFields.includes(activeFilter.id) ? (
            <NumericFilter
              filter={activeFilter}
              onChange={(selected) => {
                handleFilterSelection(activeFilter.id, selected);
              }}
            />
          ) : activeFilter.options.length > DROPDOWN_THRESHOLD ? (
            <DropdownFilter
              filter={activeFilter}
              onChange={(selected) => {
                handleFilterSelection(activeFilter.id, selected);
              }}
              mapping={
                activeFilter.id === "country_codes"
                  ? countryMap
                  : activeFilter.id === "language_codes"
                  ? languageMap
                  : undefined
              }
            />
          ) : (
            <ChipsFilter
              filter={activeFilter}
              onChange={(selected) => {
                handleFilterSelection(activeFilter.id, selected);
              }}
              mapping={
                activeFilter.id === "country_codes"
                  ? countryMap
                  : activeFilter.id === "language_codes"
                  ? languageMap
                  : undefined
              }
            />
          )}
        </Box>
      )}
    </Box>
  );
}
