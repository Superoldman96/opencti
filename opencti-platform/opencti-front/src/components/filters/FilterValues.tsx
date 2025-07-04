import React, { Fragment, FunctionComponent } from 'react';
import { last } from 'ramda';
import makeStyles from '@mui/styles/makeStyles';
import Tooltip from '@mui/material/Tooltip';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import { ChipOwnProps } from '@mui/material/Chip/Chip';
import { WarningOutlined } from '@mui/icons-material';
import { Link } from 'react-router-dom';
import { useFormatter } from '../i18n';
import type { Theme } from '../Theme';
import { FiltersRestrictions, isFilterEditable, isFilterGroupNotEmpty, isRegardingOfFilterWarning, useFilterDefinition } from '../../utils/filters/filtersUtils';
import { isDateIntervalTranslatable, translateDateInterval, truncate } from '../../utils/String';
import FilterValuesContent from '../FilterValuesContent';
import { FilterRepresentative } from './FiltersModel';
import { Filter } from '../../utils/filters/filtersHelpers-types';
import useSchema from '../../utils/hooks/useSchema';
import FilterValuesForDynamicSubKey from './FilterValuesForDynamicSubKey';

// Deprecated - https://mui.com/system/styles/basics/
// Do not use it for new code.
const useStyles = makeStyles<Theme>((theme) => ({
  inlineOperator: {
    display: 'inline-block',
    height: '100%',
    borderRadius: 0,
    margin: '0 5px 0 5px',
    padding: '0 5px 0 5px',
    cursor: 'pointer',
    backgroundColor: theme.palette.action?.disabled,
    fontFamily: 'Consolas, monaco, monospace',
    '&:hover': {
      textDecorationLine: 'underline',
      backgroundColor: theme.palette.text?.disabled,
    },
  },
  inlineOperatorReadOnly: {
    display: 'inline-block',
    height: '100%',
    borderRadius: 0,
    margin: '0 5px 0 5px',
    padding: '0 5px 0 5px',
    backgroundColor: theme.palette.action?.disabled,
    fontFamily: 'Consolas, monaco, monospace',
  },
  label: {
    cursor: 'pointer',
    '&:hover': {
      textDecorationLine: 'underline',
    },
  },
}));

interface FilterValuesProps {
  label: string | React.JSX.Element;
  tooltip?: boolean;
  currentFilter: Filter;
  filtersRepresentativesMap: Map<string, FilterRepresentative>;
  redirection?: boolean;
  handleSwitchLocalMode?: (filter: Filter) => void;
  onClickLabel?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  isReadWriteFilter?: boolean;
  chipColor?: ChipOwnProps['color'];
  noLabelDisplay?: boolean;
  entityTypes?: string[];
  filtersRestrictions?: FiltersRestrictions;
}

const FilterValues: FunctionComponent<FilterValuesProps> = ({
  label,
  tooltip,
  currentFilter,
  filtersRepresentativesMap,
  redirection,
  handleSwitchLocalMode,
  onClickLabel,
  isReadWriteFilter,
  chipColor,
  noLabelDisplay,
  entityTypes,
  filtersRestrictions,
}) => {
  const { t_i18n } = useFormatter();
  const classes = useStyles();
  const { schema: { scos } } = useSchema();

  const filterKey = currentFilter.key;
  const filterOperator = currentFilter.operator;
  const filterValues = currentFilter.values;
  const isOperatorNil = ['nil', 'not_nil'].includes(filterOperator ?? 'eq');
  const deactivatePopoverMenu = !isFilterEditable(filtersRestrictions, filterKey, filterValues) || !isReadWriteFilter;
  const onCLick = deactivatePopoverMenu ? () => {} : onClickLabel;
  const menuClassName = deactivatePopoverMenu ? '' : classes.label;

  // special case for nil/not_nil
  if (isOperatorNil) {
    return (
      <>
        <strong
          className={menuClassName}
          onClick={onCLick}
        >
          {label}
        </strong>{' '}
        <span>
          {filterOperator === 'nil' ? t_i18n('is empty') : t_i18n('is not empty')}
        </span>
      </>
    );
  }

  // special case for within operator in a 'last XX' format (ie : value1 is a relative date before now, and value2 is 'now')
  if (filterOperator === 'within'
    && isDateIntervalTranslatable(filterValues)
  ) {
    const relativeValue = translateDateInterval(filterValues, t_i18n);
    return (
      <>
        <strong
          className={menuClassName}
          onClick={onCLick}
        >
          {label}
        </strong>{' '}
        <span>
          {relativeValue}
        </span>
      </>
    );
  }

  // general cases
  const filterDefinition = useFilterDefinition(filterKey, entityTypes);
  const values = filterValues.map((id) => {
    const isLocalModeSwitchable = isReadWriteFilter
      && handleSwitchLocalMode
      && !filtersRestrictions?.preventLocalModeSwitchingFor?.includes(filterKey)
      && isFilterEditable(filtersRestrictions, filterKey, filterValues);
    const operatorClassName = isLocalModeSwitchable ? classes.inlineOperator : classes.inlineOperatorReadOnly;
    const operatorOnClick = isLocalModeSwitchable ? () => handleSwitchLocalMode(currentFilter) : undefined;
    const value = filtersRepresentativesMap.get(id) ? filtersRepresentativesMap.get(id)?.value : id;
    return (
      <Fragment key={id}>
        {filterOperator === 'within'
          ? <>
            {filterValues[0] === id && <span>[</span>}
            <FilterValuesContent
              isFilterTooltip={!!tooltip}
              filterKey={filterKey}
              id={id}
              value={value}
              filterDefinition={filterDefinition}
              filterOperator={filterOperator}
            />
            <span>
              {last(filterValues) === id ? ']' : ', '}
            </span>
          </>
          : <>
            <FilterValuesContent
              redirection={tooltip ? false : redirection}
              isFilterTooltip={!!tooltip}
              filterKey={filterKey}
              id={id}
              value={value}
              filterDefinition={filterDefinition}
              filterOperator={filterOperator}
            />
            {filterKey !== 'regardingOf' && filterKey !== 'dynamicRegardingOf' && last(filterValues) !== id && (
              <div
                className={operatorClassName}
                onClick={operatorOnClick}
              >
                {t_i18n((currentFilter.mode ?? 'or').toUpperCase())}
              </div>
            )}
          </>
        }
      </Fragment>
    );
  });

  if (filterKey === 'regardingOf' || filterKey === 'dynamicRegardingOf') {
    const sortedFilterValues = [...filterValues].sort((a, b) => -a.key.localeCompare(b.key)); // display type first, then id

    // add warning for (relationship type / ids) combinations that may not display all the results because of denormalization
    const isWarning = isRegardingOfFilterWarning(currentFilter, scos.map((n) => n.id), filtersRepresentativesMap);

    return (
      <>
        {isWarning && (
          <Tooltip title={
            t_i18n('', {
              id: 'All the results may not be displayed for these filter values, read documentation for more information.',
              values: {
                link: <Link target="_blank" to="https://docs.opencti.io/latest/reference/filters/?h=regarding#the-regardingof-filter-key">
                  {t_i18n('read documentation')}
                </Link>,
              },
            })
          }
          >
            <WarningOutlined
              color={'inherit'}
              style={{ fontSize: 20, color: '#f44336', marginRight: 4 }}
            />
          </Tooltip>
        )}
        <strong
          className={menuClassName}
          onClick={onCLick}
        >
          {label}
        </strong>{' '}
        <Box sx={{ display: 'flex', flexDirection: 'row', overflow: 'hidden' }}>
          {sortedFilterValues
            .map((val) => {
              const subKey = val.key;
              const keyLabel = (
                <>
                  {truncate(t_i18n(subKey), 20)}
                  <>&nbsp;=</>
                </>
              );
              if (subKey === 'dynamic') {
                const [dynamicValue] = val.values;
                if (!isFilterGroupNotEmpty(dynamicValue)) {
                  return <div key={val.key}/>;
                }
                return (
                  <FilterValuesForDynamicSubKey
                    key={val.key}
                    filterValue={dynamicValue}
                    chipColor={chipColor}
                  />
                );
              }
              return (
                <Fragment key={val.key}>
                  <Tooltip
                    title={
                      <FilterValues
                        label={keyLabel}
                        tooltip={true}
                        currentFilter={val}
                        filtersRepresentativesMap={filtersRepresentativesMap}
                      />
                    }
                  >
                    <Box
                      sx={{
                        padding: '0 4px',
                        display: 'flex',
                      }}
                    >
                      <Chip
                        label={
                          <FilterValues
                            label={keyLabel}
                            tooltip={false}
                            currentFilter={val}
                            filtersRepresentativesMap={filtersRepresentativesMap}
                            redirection
                            noLabelDisplay={true}
                          />
                        }
                        color={chipColor}
                      />
                    </Box>
                  </Tooltip>
                </Fragment>
              );
            })
          }
        </Box>
      </>
    );
  }
  if (noLabelDisplay) {
    return (
      <>{values}</>
    );
  }
  if (filterKey === 'dynamicFrom' || filterKey === 'dynamicTo') {
    return (
      <>
        <strong
          className={menuClassName}
          onClick={onCLick}
        >
          {label}
        </strong>{' '}
        <Chip
          label={t_i18n('Dynamic filter')}
          color={chipColor}
        />
      </>
    );
  }
  return (
    <>
      <strong
        className={menuClassName}
        onClick={onCLick}
      >
        {label}
      </strong>{' '}
      {values}
    </>
  );
};

export default FilterValues;
