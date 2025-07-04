import React from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '@mui/material/Button';
import { graphql } from 'react-relay';
import { Stack } from '@mui/material';
import { useFormatter } from '../../../../components/i18n';
import Security from '../../../../utils/Security';
import { KNOWLEDGE_KNUPDATE_KNDELETE } from '../../../../utils/hooks/useGranted';
import useApiMutation from '../../../../utils/hooks/useApiMutation';
import useDeletion from '../../../../utils/hooks/useDeletion';
import { MESSAGING$ } from '../../../../relay/environment';
import { RelayError } from '../../../../relay/relayTypes';
import DeleteDialog from '../../../../components/DeleteDialog';

const StixCyberObservableDeletionDeleteMutation = graphql`
  mutation StixCyberObservableDeletionDeleteMutation($id: ID!) {
    stixCyberObservableEdit(id: $id) {
        delete
      }
    }
  `;

const StixCyberObservableDeletion = (
  { id }: { id: string },
) => {
  const navigate = useNavigate();
  const { t_i18n } = useFormatter();
  const deleteSuccessMessage = t_i18n('', {
    id: '... successfully deleted',
    values: { entity_type: t_i18n('entity_Observable') },
  });
  const [commit] = useApiMutation(
    StixCyberObservableDeletionDeleteMutation,
    undefined,
    { successMessage: deleteSuccessMessage },
  );
  const isArtifactInURL = window.location.href.includes('artifact');
  const handleClose = () => { };
  const deletion = useDeletion({ handleClose });
  const { setDeleting, handleOpenDelete, deleting } = deletion;
  const submitDelete = () => {
    setDeleting(true);
    commit({
      variables: {
        id,
      },
      onCompleted: () => {
        setDeleting(false);
        handleClose();
        navigate(`/dashboard/observations/${isArtifactInURL ? 'artifacts' : 'observables'}`);
      },
      onError: (error) => {
        const { errors } = (error as unknown as RelayError).res;
        MESSAGING$.notifyError(errors.at(0)?.message);
      },
    });
  };
  return (
    <Stack flexDirection="row" justifyContent="flex-end" gap={2}>
      <Security needs={[KNOWLEDGE_KNUPDATE_KNDELETE]}>
        <Button
          color="error"
          variant="contained"
          onClick={handleOpenDelete}
          disabled={deleting}
          sx={{ marginTop: 2 }}
        >
          {t_i18n('Delete')}
        </Button>
      </Security>
      <DeleteDialog
        deletion={deletion}
        submitDelete={submitDelete}
        message={t_i18n('Do you want to delete this observable?')}
      />
    </Stack>
  );
};

export default StixCyberObservableDeletion;
