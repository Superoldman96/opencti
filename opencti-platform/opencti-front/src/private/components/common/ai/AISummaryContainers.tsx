import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { graphql, useSubscription } from 'react-relay';
import parse from 'html-react-parser';
import Grid from '@mui/material/Grid';
import Alert from '@mui/material/Alert';
import { GraphQLSubscriptionConfig } from 'relay-runtime';
import { AutoModeOutlined, ContentCopyOutlined } from '@mui/icons-material';
import IconButton from '@mui/material/IconButton';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';
import { AISummaryContainersContainersAskAiSummaryQuery$data } from '@components/common/ai/__generated__/AISummaryContainersContainersAskAiSummaryQuery.graphql';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import Tooltip from '@mui/material/Tooltip';
import { AISummaryContainersSubscription, AISummaryContainersSubscription$data } from './__generated__/AISummaryContainersSubscription.graphql';
import { useFormatter } from '../../../../components/i18n';
import { FilterGroup, handleFilterHelpers } from '../../../../utils/filters/filtersHelpers-types';
import { getDefaultAiLanguage } from '../../../../utils/ai/Common';
import { fetchQuery } from '../../../../relay/environment';
import { cleanHtmlTags, copyToClipboard } from '../../../../utils/utils';
import { daysAgo, monthsAgo } from '../../../../utils/Time';
import { RelayError } from '../../../../relay/relayTypes';

const subscription = graphql`
    subscription AISummaryContainersSubscription($id: ID!) {
      aiBus(id: $id) {
        content
      }
    }
`;

const aISummaryContainersQuery = graphql`
  query AISummaryContainersContainersAskAiSummaryQuery(
    $busId: String
    $first: Int
    $orderBy: ContainersOrdering
    $orderMode: OrderingMode
    $filters: FilterGroup
    $search: String
    $language: String
    $forceRefresh: Boolean
  ) {
    containersAskAiSummary(
      busId: $busId
      first: $first
      orderBy: $orderBy,
      orderMode: $orderMode
      filters: $filters
      search: $search
      language: $language
      forceRefresh: $forceRefresh
    ) {
      result
      topics
      updated_at
    }
  }
`;

interface AISummaryContainersComponentProps {
  refetch: (newFirst: number, newRelative: string) => void
  relative: string
  changeRelative: (relative: string) => void
  first: number
  changeFirst: (first: number) => void
  language: string
  setLanguage: (language: string) => void
  content: string
  loading: boolean
  result: AISummaryContainersContainersAskAiSummaryQuery$data | null
  isContainer: boolean
}
const AISummaryContainersComponent = ({
  refetch,
  changeFirst,
  first,
  relative,
  changeRelative,
  content,
  result,
  loading,
  isContainer,
}: AISummaryContainersComponentProps) => {
  const { t_i18n, nsdt } = useFormatter();
  return (
    <>
      <Alert severity="info" variant="outlined" style={{ marginTop: 20 }}>
        {t_i18n('This summary is based on the whole content of related containers (description, content and attached files). It has been generated by AI and can contain mistakes.')}
        {!isContainer && (
          <Grid container={true} spacing={3} style={{ marginTop: -5 }}>
            <Grid item={true} xs={3}>
              <FormControl
                size="small"
                variant="outlined"
                style={{ width: '100%' }}
                disabled={loading}
              >
                <InputLabel id="relative" variant="outlined">
                  {t_i18n('Relative time')}
                </InputLabel>
                <Select
                  labelId="relative"
                  value={relative}
                  onChange={(event) => changeRelative(event.target.value as string)}
                  label={t_i18n('Relative time')}
                  variant="outlined"
                >
                  <MenuItem value="none">{t_i18n('None')}</MenuItem>
                  <MenuItem value="days-1">{t_i18n('Last 24 hours')}</MenuItem>
                  <MenuItem value="days-7">{t_i18n('Last 7 days')}</MenuItem>
                  <MenuItem value="months-1">{t_i18n('Last month')}</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item={true} xs={3}>
              <FormControl
                size="small"
                variant="outlined"
                style={{ width: '100%' }}
                disabled={loading}
              >
                <InputLabel id="first" variant="outlined">
                  {t_i18n('Limit of elements')}
                </InputLabel>
                <Select
                  labelId="first"
                  value={first}
                  onChange={(event) => changeFirst(event.target.value as number)}
                  label={t_i18n('Limit of elements')}
                  variant="outlined"
                >
                  <MenuItem value={10}>10</MenuItem>
                  <MenuItem value={15}>15</MenuItem>
                  <MenuItem value={20}>20</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        )}
      </Alert>
      {parse(content)}
      {!loading && (
        <>
          <Divider />
          <div style={{ float: 'right', marginTop: 20, display: 'flex', alignItems: 'center', gap: '5px' }}>
            <Typography variant="caption">Generated on {nsdt(result?.containersAskAiSummary?.updated_at)}.</Typography>
            <Tooltip title={t_i18n('Copy to clipboard')}>
              <IconButton size="small" color="primary" onClick={() => copyToClipboard(t_i18n, content)}>
                <ContentCopyOutlined fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title={t_i18n('Retry')}>
              <IconButton size="small" color="primary" onClick={() => refetch(first, relative)}>
                <AutoModeOutlined fontSize="small" />
              </IconButton>
            </Tooltip>
          </div>
        </>
      )}
    </>
  );
};

interface ContainersAiSummaryProps {
  busId: string
  isContainer: boolean
  filters: FilterGroup
  helpers: handleFilterHelpers
  loading: boolean
  setLoading: (loading: boolean) => void
}

const AISummaryContainers = ({ busId, isContainer, filters, loading, setLoading }: ContainersAiSummaryProps) => {
  const defaultLanguageName = getDefaultAiLanguage();
  const [first, setFirst] = useState(isContainer ? 1 : 10);
  const [relative, setRelative] = useState('none');
  const [content, setContent] = useState('');
  const [result, setResult] = useState<AISummaryContainersContainersAskAiSummaryQuery$data | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined);
  const [language, setLanguage] = useState(defaultLanguageName);

  // Subscription
  const handleResponse = (response: AISummaryContainersSubscription$data | null | undefined) => {
    const newContent = response ? (response as AISummaryContainersSubscription$data).aiBus?.content : null;
    const finalContent = cleanHtmlTags(newContent);
    return setContent(finalContent);
  };
  const subConfig = useMemo<GraphQLSubscriptionConfig<AISummaryContainersSubscription>>(
    () => ({
      subscription,
      variables: { id: busId },
      onNext: handleResponse,
    }),
    [busId],
  );
  // TODO: Check by the engineering team
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  useSubscription(subConfig);

  // Query
  const queryParams = {
    busId,
    first,
    filters,
    orderBy: 'created',
    orderMode: 'desc',
    language,
  };
  useEffect(() => {
    setLoading(true);
    fetchQuery(aISummaryContainersQuery, queryParams).toPromise().then((data) => {
      const resultData = data as AISummaryContainersContainersAskAiSummaryQuery$data;
      if (resultData && resultData.containersAskAiSummary) {
        setErrorMessage(undefined);
        setResult(resultData);
        setContent(resultData.containersAskAiSummary.result ?? '');
        setLoading(false);
      }
    }).catch((error: RelayError) => {
      const { errors } = error.res;
      setErrorMessage(errors.at(0)?.message);
      setLoading(false);
    });
  }, []);

  const refetch = useCallback((newFirst: number, newRelative: string) => {
    // Compute relative date
    let startDate = null;
    if (newRelative === 'days-1') {
      startDate = daysAgo(1);
    }
    if (newRelative === 'days-7') {
      startDate = daysAgo(7);
    }
    if (newRelative === 'months-1') {
      startDate = monthsAgo(1);
    }
    const finalFilters = isContainer || !startDate ? filters
      : {
        mode: filters.mode,
        filters: [...filters.filters, { key: 'created', values: [startDate], operator: 'gte' }],
        filterGroups: filters.filterGroups,
      };
    setLoading(true);
    fetchQuery(aISummaryContainersQuery, {
      busId,
      first: newFirst,
      filters: finalFilters,
      orderBy: 'created',
      orderMode: 'desc',
      language,
      forceRefresh: true,
    }).toPromise().then((data) => {
      const resultData = data as AISummaryContainersContainersAskAiSummaryQuery$data;
      if (resultData && resultData.containersAskAiSummary) {
        setResult(resultData);
        setContent(resultData.containersAskAiSummary.result ?? '');
        setLoading(false);
      }
    });
  }, []);

  const changeFirst = (newFirst: number) => {
    setFirst(newFirst);
    refetch(newFirst, relative);
  };

  const changeRelative = (newRelative: string) => {
    setRelative(newRelative);
    refetch(first, newRelative);
  };

  return (
    <>
      {errorMessage ? (
        <Alert severity="warning" variant="outlined" style={{ marginBlock: 20 }}>{errorMessage}</Alert>
      ) : (
        <AISummaryContainersComponent
          first={first}
          changeFirst={changeFirst}
          relative={relative}
          changeRelative={changeRelative}
          language={language}
          setLanguage={setLanguage}
          refetch={refetch}
          content={content}
          result={result}
          loading={loading}
          isContainer={isContainer}
        />
      )}
    </>
  );
};

export default AISummaryContainers;
