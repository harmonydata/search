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
  Button,
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

// Helper function to format labels nicely (replace underscores with spaces and capitalize)
const formatLabel = (label: string): string => {
  return label
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
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
  'age_range',
  'time_range'
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
               filter.id.includes("year") || filter.id === "time_range") {
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

  // Format the options for display
  const getOptionLabel = (option: string) => {
    if (mapping && mapping[option]) {
      return mapping[option];
    }
    // Format option label for better readability
    return formatLabel(option);
  };

  return (
    <Autocomplete
      multiple
      options={filter.options}
      getOptionLabel={getOptionLabel}
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

  // Get formatted label for display
  const getLabel = (option: string) => {
    if (mapping && mapping[option]) {
      return mapping[option];
    }
    return formatLabel(option);
  };

  return (
    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
      {filter.options.map((option) => (
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
  
  // Track whether initial filters have been set
  const [initialFiltersSet, setInitialFiltersSet] = useState<boolean>(false);

  // Function to reset all filters
  const resetAllFilters = () => {
    // Clear all selected filters
    setSelectedFilters({});
    
    // Notify parent component
    if (onSelectionChange) {
      // Get all filter keys currently in use
      const allFilterKeys = Object.keys(selectedFilters);
      
      // Clear each filter individually
      allFilterKeys.forEach(key => {
        // For special case filters like age_range that map to multiple API parameters
        if (key === "sample_characteristics#age_range") {
          onSelectionChange("age_min", []);
          onSelectionChange("age_max", []);
        } 
        else if (key === "sample_characteristics#time_range") {
          onSelectionChange("start_year", []);
          onSelectionChange("end_year", []);
        }
        else if (key.includes("#") && numericFields.includes(key.split("#")[1])) {
          // For numeric fields, clear both min and max
          const filterId = key.split("#")[1];
          onSelectionChange(`${filterId}_min`, []);
          onSelectionChange(`${filterId}_max`, []);
        }
        else if (key.includes("#")) {
          // For sub-filters, extract and clear the actual filter ID
          const filterId = key.split("#")[1];
          onSelectionChange(filterId, []);
        } 
        else {
          // For top-level filters
          onSelectionChange(key, []);
        }
      });
    }
  };

  React.useEffect(() => {
    // Only process and set filters if they haven't been set yet
    // or if filtersData has changed AND we haven't set any filters yet
    if (!initialFiltersSet && filtersData && filtersData.length > 0) {
      let filtersCopy = [...filtersData];
      
      // List of filter IDs that should be grouped under "Sample Characteristics"
      const characteristicsIds = [
        "genetic_data",
        "study_design",
        "duration_years",
        "sample_size",
        "age_lower",
        "age_upper",
        "start_year",
        "end_year",
        "num_variables",
        "num_sweeps"
      ];
      
      // Extract the filters that should be grouped under "Sample Characteristics"
      const subFilters = filtersCopy.filter((f) =>
        characteristicsIds.includes(f.id)
      );
      
      // Process filters to create both age_range and time_range combined filters
      const updatedSubFilters = [...subFilters]; // Start with a copy of all subfilters
      
      // Create a combined age range filter if both age_lower and age_upper exist
      const ageLowerFilter = subFilters.find(f => f.id === "age_lower");
      const ageUpperFilter = subFilters.find(f => f.id === "age_upper");
      
      if (ageLowerFilter && ageUpperFilter) {
        // Remove individual age filters from the updated subfilters
        const filteredSubFilters = updatedSubFilters.filter(f => 
          f.id !== "age_lower" && f.id !== "age_upper"
        );
        
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
        
        // Add the combined filter to updated subfilters
        updatedSubFilters.splice(updatedSubFilters.length, 0, combinedAgeFilter);
      }
      
      // Create a combined time range filter if both start_year and end_year exist
      const startYearFilter = subFilters.find(f => f.id === "start_year");
      const endYearFilter = subFilters.find(f => f.id === "end_year");
      
      if (startYearFilter && endYearFilter) {
        // Remove individual year filters from the updated subfilters
        const filteredSubFilters = updatedSubFilters.filter(f => 
          f.id !== "start_year" && f.id !== "end_year"
        );
        
        // Get numeric values from both filters
        const startYearValues = startYearFilter.options
          .map(o => Number(o))
          .filter(n => !isNaN(n) && isFinite(n));
          
        const endYearValues = endYearFilter.options
          .map(o => Number(o))
          .filter(n => !isNaN(n) && isFinite(n));
        
        // Calculate the actual min and max for the combined range
        const minYear = startYearValues.length > 0 ? Math.min(...startYearValues) : 1900;
        const maxYear = endYearValues.length > 0 ? Math.max(...endYearValues) : 2024;
        
        // Create a new combined time range filter with proper min/max values
        const combinedTimeFilter: AggregateFilter = {
          id: "time_range",
          label: "Time Coverage",
          options: [
            String(minYear),
            String(maxYear)
          ]
        };
        
        // Add the combined filter to updated subfilters
        updatedSubFilters.splice(updatedSubFilters.length, 0, combinedTimeFilter);
      }
      
      // Filter out the characteristics IDs from the main filter list
      filtersCopy = filtersCopy.filter(
        (f) => !characteristicsIds.includes(f.id)
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
    } else if (!initialFiltersSet && (!filtersData || filtersData.length === 0)) {
      // If filtersData prop is not provided and we haven't set filters yet, fetch from API
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
            "start_year",
            "end_year",
            "num_variables",
            "num_sweeps"
          ];
          
          // Extract the filters that should be grouped under "Sample Characteristics"
          const subFilters = filtersCopy.filter((f) =>
            characteristicsIds.includes(f.id)
          );
          
          // Process filters to create both age_range and time_range combined filters
          const updatedSubFilters = [...subFilters]; // Start with a copy of all subfilters
          
          // Create a combined age range filter if both age_lower and age_upper exist
          const ageLowerFilter = subFilters.find(f => f.id === "age_lower");
          const ageUpperFilter = subFilters.find(f => f.id === "age_upper");
          
          if (ageLowerFilter && ageUpperFilter) {
            // Remove individual age filters from the updated subfilters
            const filteredSubFilters = updatedSubFilters.filter(f => 
              f.id !== "age_lower" && f.id !== "age_upper"
            );
            
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
            
            // Add the combined filter to updated subfilters
            updatedSubFilters.splice(filteredSubFilters.length, 0, combinedAgeFilter);
          }
          
          // Create a combined time range filter if both start_year and end_year exist
          const startYearFilter = subFilters.find(f => f.id === "start_year");
          const endYearFilter = subFilters.find(f => f.id === "end_year");
          
          if (startYearFilter && endYearFilter) {
            // Remove individual year filters from the updated subfilters
            const filteredSubFilters = updatedSubFilters.filter(f => 
              f.id !== "start_year" && f.id !== "end_year"
            );
            
            // Get numeric values from both filters
            const startYearValues = startYearFilter.options
              .map(o => Number(o))
              .filter(n => !isNaN(n) && isFinite(n));
              
            const endYearValues = endYearFilter.options
              .map(o => Number(o))
              .filter(n => !isNaN(n) && isFinite(n));
            
            // Calculate the actual min and max for the combined range
            const minYear = startYearValues.length > 0 ? Math.min(...startYearValues) : 1900;
            const maxYear = endYearValues.length > 0 ? Math.max(...endYearValues) : 2024;
            
            // Create a new combined time range filter with proper min/max values
            const combinedTimeFilter: AggregateFilter = {
              id: "time_range",
              label: "Time Coverage",
              options: [
                String(minYear),
                String(maxYear)
              ]
            };
            
            // Add the combined filter to updated subfilters
            updatedSubFilters.splice(filteredSubFilters.length, 0, combinedTimeFilter);
          }
          
          // Filter out the characteristics IDs from the main filter list
          filtersCopy = filtersCopy.filter(
            (f) => !characteristicsIds.includes(f.id)
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
          console.log("Initial filters set from API with", filtersCopy.length, "categories");
        })
        .catch((error) => {
          console.error("Error fetching aggregate filters:", error);
        });
    }
    // Remove the dependency on filtersData so it doesn't re-run when prop changes
    // Only respond to changes in initialFiltersSet state
  }, [initialFiltersSet, selectedCategory]);

  // Handle special case of time_range filter when user selects a range
  const handleFilterSelection = (categoryId: string, selectedOptions: string[]) => {
    // Handle numeric range filters with min/max parameters
    if (categoryId.includes("#") && categoryId.split("#")[1]) {
      const [parentId, filterId] = categoryId.split("#");
      
      // Check if this is a numeric field that should use min/max parameters
      const isNumericField = numericFields.includes(filterId);
      
      if (isNumericField && selectedOptions.length === 2) {
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
          
          // Only set the filters if the user has actually filtered (not at full range)
          const isFullRange = minValue <= originalMin + 0.1 && maxValue >= originalMax - 0.1;
          
          if (!isFullRange) {
            // Handle special cases
            if (filterId === "age_range") {
              // Age range is a special case that maps to age_min and age_max parameters
              if (onSelectionChange) {
                onSelectionChange("age_min", [String(minValue)]);
                onSelectionChange("age_max", [String(maxValue)]);
              }
              
              // Update local state
              setSelectedFilters(prev => ({
                ...prev,
                "age_min": [String(minValue)],
                "age_max": [String(maxValue)],
                [categoryId]: selectedOptions
              }));
            } 
            else if (filterId === "time_range") {
              // Time range maps to start_year and end_year
              if (onSelectionChange) {
                onSelectionChange("start_year", [String(minValue)]);
                onSelectionChange("end_year", [String(maxValue)]);
              }
              
              // Update local state
              setSelectedFilters(prev => ({
                ...prev,
                "start_year": [String(minValue)],
                "end_year": [String(maxValue)],
                [categoryId]: selectedOptions
              }));
            }
            else {
              // For all other numeric fields, use {field}_min and {field}_max pattern
              const minParamName = `${filterId}_min`;
              const maxParamName = `${filterId}_max`;
              
              if (onSelectionChange) {
                onSelectionChange(minParamName, [String(minValue)]);
                onSelectionChange(maxParamName, [String(maxValue)]);
              }
              
              // Update local state
              setSelectedFilters(prev => ({
                ...prev,
                [minParamName]: [String(minValue)],
                [maxParamName]: [String(maxValue)],
                [categoryId]: selectedOptions
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
            else if (filterId === "time_range") {
              if (onSelectionChange) {
                onSelectionChange("start_year", []);
                onSelectionChange("end_year", []);
              }
              
              // Update local state
              setSelectedFilters(prev => {
                const newState = { ...prev };
                delete newState["start_year"];
                delete newState["end_year"];
                return {
                  ...newState,
                  [categoryId]: selectedOptions
                };
              });
            } 
            else {
              // For all other numeric fields
              const minParamName = `${filterId}_min`;
              const maxParamName = `${filterId}_max`;
              
              if (onSelectionChange) {
                onSelectionChange(minParamName, []);
                onSelectionChange(maxParamName, []);
              }
              
              // Update local state
              setSelectedFilters(prev => {
                const newState = { ...prev };
                delete newState[minParamName];
                delete newState[maxParamName];
                return {
                  ...newState,
                  [categoryId]: selectedOptions
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
      setSelectedFilters(prev => ({
        ...prev,
        [categoryId]: selectedOptions
      }));
      
      if (onSelectionChange) {
        onSelectionChange(filterId, selectedOptions);
      }
    } else {
      // For top-level filters (not within a category)
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
      'num_sweeps',
      'time_range'
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

  // Handle dropdown filter options - filter out compound sources and capitalize sources
  const processFilterOptions = (filterId: string, options: string[]): string[] => {
    if (filterId === "source") {
      // Filter out compound sources (those with spaces) and uppercase the rest
      return options
        .filter(option => !option.includes(" "))
        .map(option => option.toUpperCase());
    }
    return options;
  };

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
            variant="outlined" 
            color="secondary" 
            size="small" 
            onClick={resetAllFilters}
            sx={{ ml: 2, whiteSpace: 'nowrap' }}
          >
            Reset Filters
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
                gap: 3,  // Increased gap between items
                flexWrap: "wrap",  // Allow wrapping
                width: "100%",
              }}
            >
              {activeFilter.subFilters.map((sub: AggregateFilter) => {
                const key = `${activeFilter.id}#${sub.id}`;
                const currentSelection = selectedFilters[key] || [];
                let component = null;
                
                // Format the filter label nicely
                const displayLabel = formatLabel(sub.label || sub.id);
                
                // Process options (for sources, etc)
                const processedOptions = processFilterOptions(sub.id, sub.options);
                
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
                  sub.id === "time_range" ||
                  numericFields.includes(sub.id)
                ) {
                  component = (
                    <NumericFilter
                      filter={{
                        ...sub,
                        options: processedOptions
                      }}
                      onChange={(selected) => {
                        handleFilterSelection(key, selected);
                      }}
                    />
                  );
                } else if (processedOptions.length > DROPDOWN_THRESHOLD) {
                  let mapping: Record<string, string> | undefined;
                  if (sub.id === "country_codes") mapping = countryMap;
                  else if (sub.id === "language_codes") mapping = languageMap;
                  component = (
                    <DropdownFilter
                      filter={{
                        ...sub,
                        options: processedOptions
                      }}
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
                      filter={{
                        ...sub,
                        options: processedOptions
                      }}
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
              <Typography variant="subtitle2" gutterBottom sx={{ minWidth: 150 }}>
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
          ) : numericFields.includes(activeFilter.id) ? (
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                {formatLabel(activeFilter.label)}
              </Typography>
              <NumericFilter
                filter={activeFilter}
                onChange={(selected) => {
                  handleFilterSelection(activeFilter.id, selected);
                }}
              />
            </Box>
          ) : activeFilter.options.length > DROPDOWN_THRESHOLD ? (
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                {formatLabel(activeFilter.label)}
              </Typography>
              <DropdownFilter
                filter={{
                  ...activeFilter,
                  options: processFilterOptions(activeFilter.id, activeFilter.options)
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
                  options: processFilterOptions(activeFilter.id, activeFilter.options)
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
              />
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
}
