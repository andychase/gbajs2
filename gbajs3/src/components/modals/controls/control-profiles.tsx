import { IconButton, TextField } from '@mui/material';
import { useLocalStorage } from '@uidotdev/usehooks';
import { nanoid } from 'nanoid';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { BiTrash, BiEdit, BiSave } from 'react-icons/bi';
import { styled } from 'styled-components';

import { useLayoutContext } from '../../../hooks/context.tsx';
import { virtualControlProfilesLocalStorageKey } from '../../controls/consts.tsx';
import { CenteredText, StyledBiPlus } from '../../shared/styled.tsx';

import type { Layouts } from '../../../context/layout/layout.tsx';
import type { IconButtonProps } from '@mui/material';
import type { ReactNode } from 'react';

type ControlProfilesProps = {
  id: string;
};

type VirtualControlProfile = {
  id: string;
  name: string;
  active: boolean;
  layouts: Layouts;
};

type VirtualControlProfiles = VirtualControlProfile[];

type StatefulIconButtonProps = {
  condition: boolean;
  truthyIcon: ReactNode;
  falsyIcon: ReactNode;
} & IconButtonProps;

type EditableProfileLoadButtonProps = {
  name: string;
  loadProfile: () => void;
  onSubmit: ({ name }: { name: string }) => void;
};

const StyledLi = styled.li`
  cursor: pointer;
  display: grid;
  grid-template-columns: auto 32px;
  gap: 10px;

  color: ${({ theme }) => theme.blueCharcoal};
  background-color: ${({ theme }) => theme.pureWhite};
  border: 1px solid rgba(0, 0, 0, 0.125);
`;

const ProfilesList = styled.ul`
  list-style-type: none;
  display: flex;
  flex-direction: column;
  margin: 0;
  padding: 0;

  & > ${StyledLi}:first-child {
    border-top-left-radius: 4px;
    border-top-right-radius: 4px;
  }

  & > ${StyledLi}:last-child {
    border-bottom-left-radius: 4px;
    border-bottom-right-radius: 4px;
  }

  & > ${StyledLi}:not(:first-child) {
    border-top-width: 0;
  }
`;

const StyledCiCircleRemove = styled(BiTrash)`
  height: 100%;
  width: 20px;
`;

const StyledBiEdit = styled(BiEdit)`
  height: 100%;
  width: 20px;
`;

const StyledBiSave = styled(BiSave)`
  height: 100%;
  width: 20px;
`;

const LoadProfileButton = styled.button`
  padding: 0.5rem 0.5rem;
  width: 100%;
  color: ${({ theme }) => theme.blueCharcoal};
  background-color: ${({ theme }) => theme.pureWhite};
  border: none;
  text-align: left;
  font-size: 16px;
  height: 32px;

  &:hover {
    color: ${({ theme }) => theme.darkGrayBlue};
    background-color: ${({ theme }) => theme.aliceBlue1};
  }
`;

const StyledForm = styled.form`
  display: flex;
  gap: 10px;
`;

const StatefulIconButton = ({
  condition,
  truthyIcon,
  falsyIcon,
  ...rest
}: StatefulIconButtonProps) => (
  <IconButton sx={{ padding: 0 }} {...rest}>
    {condition ? truthyIcon : falsyIcon}
  </IconButton>
);

const EditableProfileLoadButton = ({
  name,
  loadProfile,
  onSubmit
}: EditableProfileLoadButtonProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isValid }
  } = useForm<{ name: string }>({
    defaultValues: {
      name: name
    }
  });

  return (
    <StyledForm onSubmit={handleSubmit(onSubmit)}>
      {isEditing ? (
        <TextField
          variant="standard"
          sx={{
            width: '100%',
            '& .MuiInputBase-input': {
              paddingLeft: '8px'
            }
          }}
          error={!!errors?.name}
          {...register('name', { required: true })}
        />
      ) : (
        <LoadProfileButton onClick={loadProfile}>{name}</LoadProfileButton>
      )}
      <StatefulIconButton
        condition={isEditing}
        truthyIcon={<StyledBiSave />}
        falsyIcon={<StyledBiEdit />}
        aria-label={`${isEditing ? 'Save' : 'Edit'} ${name}'s name`}
        type="submit"
        data-is-valid={isValid}
        onClick={() => isValid && setIsEditing((prevState) => !prevState)}
      />
    </StyledForm>
  );
};

export const ControlProfiles = ({ id }: ControlProfilesProps) => {
  const [virtualControlProfiles, setVirtualControlProfiles] = useLocalStorage<
    VirtualControlProfiles | undefined
  >(virtualControlProfilesLocalStorageKey);
  const { layouts, setLayouts } = useLayoutContext();

  const addProfile = () => {
    setVirtualControlProfiles((prevState) => [
      ...(prevState ?? []),
      {
        id: nanoid(),
        name: `Profile-${(prevState?.length ?? 0) + 1}`,
        layouts: layouts,
        active: true
      }
    ]);
  };

  const updateProfile = (id: string, updatedName: string) => {
    setVirtualControlProfiles((prevState) =>
      prevState?.map((profile) => {
        if (profile.id == id)
          return {
            ...profile,
            name: updatedName
          };

        return profile;
      })
    );
  };

  const deleteProfile = (id: string) => {
    setVirtualControlProfiles((prevState) =>
      prevState?.filter((p) => p.id !== id)
    );
  };

  return (
    <>
      <ProfilesList id={id} aria-label="Profiles List">
        {virtualControlProfiles?.map?.(
          (profile: VirtualControlProfile, idx: number) => (
            <StyledLi key={`${profile.name}_${idx}_action_list_item`}>
              <EditableProfileLoadButton
                name={profile.name}
                loadProfile={() => setLayouts(profile.layouts)}
                onSubmit={({ name }) => updateProfile(profile.id, name)}
              />
              <IconButton
                aria-label={`Delete ${profile.name}`}
                sx={{ padding: 0 }}
                onClick={() => deleteProfile(profile.id)}
              >
                <StyledCiCircleRemove />
              </IconButton>
            </StyledLi>
          )
        )}
        {!virtualControlProfiles?.length && (
          <li>
            <CenteredText>No control profiles</CenteredText>
          </li>
        )}
      </ProfilesList>
      <IconButton
        aria-label={`Create New Profile`}
        sx={{ padding: 0 }}
        onClick={() => addProfile()}
      >
        <StyledBiPlus />
      </IconButton>
    </>
  );
};
