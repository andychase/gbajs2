import { Button, IconButton, TextField } from '@mui/material';
import { useCallback, useId, useMemo, useRef, useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { BiTrash } from 'react-icons/bi';
import { styled } from 'styled-components';

import { ModalBody } from './modal-body.tsx';
import { ModalFooter } from './modal-footer.tsx';
import { ModalHeader } from './modal-header.tsx';
import { useEmulatorContext, useModalContext } from '../../hooks/context.tsx';
import { useAddCallbacks } from '../../hooks/emulator/use-add-callbacks.tsx';
import { CircleCheckButton } from '../shared/circle-check-button.tsx';
import { ManagedSwitch } from '../shared/managed-switch.tsx';
import { StyledBiPlus } from '../shared/styled.tsx';

type OptionallyHiddenProps = {
  $shouldHide: boolean;
};

type HelpTextProps = {
  $withMargin: boolean;
};

const Cheat = styled.li`
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  gap: 10px;
  align-items: center;
  border-bottom: 1px solid ${({ theme }) => theme.pattensBlue};
  padding-bottom: 5px;
  width: 100%;
`;

const CheatsList = styled.ul<OptionallyHiddenProps>`
  list-style: none;
  display: ${({ $shouldHide = false }) => ($shouldHide ? 'none' : 'flex')};
  flex-direction: column;
  gap: 10px;
  padding: 10px;
  margin: 0;
  max-width: 100%;

  & > ${Cheat}:not(:first-child) {
    padding-top: 10px;
  }
`;

const CheatsFormSeparator = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 100%;
`;

const RowContainer = styled.div`
  display: flex;
  flex-direction: row;
  gap: 15px;
  justify-content: space-between;
`;

const HelpText = styled.p<HelpTextProps>`
  margin-bottom: 0;
  margin-left: 0;
  margin-right: 0;
  margin-top: ${({ $withMargin = false }) => ($withMargin ? '5px' : '0')};
`;

export const CheatsModal = () => {
  const { setIsModalOpen } = useModalContext();
  const { emulator } = useEmulatorContext();
  const [viewRawCheats, setViewRawCheats] = useState(false);
  const { syncActionIfEnabled } = useAddCallbacks();
  const createNewCheatButtonRef = useRef<HTMLButtonElement>(null);
  const cheatsFormId = useId();
  const defaultCheat = { desc: '', code: '', enable: true };

  const [rawCheats, parsedCheats] = useMemo(() => {
    const cheatsFile = emulator?.getCurrentCheatsFile();
    const rawCheats = new TextDecoder().decode(cheatsFile);

    return [rawCheats, emulator?.parseCheatsString(rawCheats)];
  }, [emulator]);

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitSuccessful }
  } = useForm({
    defaultValues: {
      rawCheats: rawCheats,
      cheats: parsedCheats?.length ? parsedCheats : [defaultCheat]
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'cheats'
  });

  const refreshForm = useCallback(() => {
    const cheatsFile = emulator?.getCurrentCheatsFile();
    const rawCheats = new TextDecoder().decode(cheatsFile);
    const parsedCheats = emulator?.parseCheatsString(rawCheats) ?? [];

    if (viewRawCheats) setValue('cheats', parsedCheats);
    else setValue('rawCheats', rawCheats);
  }, [emulator, setValue, viewRawCheats]);

  return (
    <>
      <ModalHeader title="Manage Cheats" />
      <ModalBody>
        <form
          aria-label="Cheats Form"
          id={cheatsFormId}
          onSubmit={handleSubmit((data) => {
            const cheatsFile = viewRawCheats
              ? new File(
                  [new Blob([data.rawCheats], { type: 'text/plain' })],
                  emulator?.getCurrentCheatsFileName() ?? 'unknown.cheats'
                )
              : emulator?.parsedCheatsToFile(data.cheats);

            if (cheatsFile)
              emulator?.uploadCheats(cheatsFile, async () => {
                await syncActionIfEnabled();
                emulator.autoLoadCheats();
                refreshForm();
              });
          })}
        >
          <TextField
            error={!!errors.rawCheats}
            label="Raw Libretro Cheats"
            multiline
            fullWidth
            minRows={6}
            variant="outlined"
            helperText={errors.rawCheats?.message}
            slotProps={{
              input: {
                sx: {
                  ['textarea']: {
                    whiteSpace: 'pre',
                    // see: https://github.com/mui/material-ui/issues/41490
                    //      remove/refactor once resolved
                    overflowX: 'auto !important'
                  }
                }
              },
              inputLabel: { shrink: true }
            }}
            style={{ display: viewRawCheats ? 'block' : 'none' }}
            {...register('rawCheats')}
          />
          <CheatsList $shouldHide={viewRawCheats}>
            {fields.map((item, index) => (
              <Cheat key={item.id}>
                <CheatsFormSeparator>
                  <TextField
                    label="Name"
                    error={!!errors.cheats?.[index]?.desc}
                    size="small"
                    autoComplete="Cheat Name"
                    helperText={errors.cheats?.[index]?.desc?.message}
                    {...register(`cheats.${index}.desc`, {
                      required: {
                        value: true,
                        message: 'required'
                      }
                    })}
                  />
                  <TextField
                    label="Cheat Code"
                    error={!!errors.cheats?.[index]?.code}
                    size="small"
                    autoComplete="Code"
                    helperText={errors.cheats?.[index]?.code?.message}
                    {...register(`cheats.${index}.code`, {
                      required: {
                        value: true,
                        message: 'required'
                      }
                    })}
                  />

                  <RowContainer>
                    <ManagedSwitch
                      label="Enabled"
                      watcher={watch(`cheats.${index}.enable`)}
                      {...register(`cheats.${index}.enable`)}
                    />
                    <IconButton
                      aria-label="Remove Cheat"
                      sx={{ padding: '5px' }}
                      onClick={() => remove(index)}
                    >
                      <BiTrash />
                    </IconButton>
                  </RowContainer>
                </CheatsFormSeparator>
              </Cheat>
            ))}
          </CheatsList>
          <RowContainer>
            <IconButton
              aria-label="Create new cheat"
              ref={createNewCheatButtonRef}
              sx={{ padding: 0, display: viewRawCheats ? 'none' : 'flex' }}
              onClick={() => {
                append(defaultCheat, { shouldFocus: false });

                requestAnimationFrame(() => {
                  createNewCheatButtonRef.current?.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                  });
                });
              }}
            >
              <StyledBiPlus />
            </IconButton>
            <HelpText $withMargin={viewRawCheats}>
              Join multi-line codes with '+'
            </HelpText>
          </RowContainer>
        </form>
      </ModalBody>
      <ModalFooter>
        <CircleCheckButton
          copy="Submit"
          form={cheatsFormId}
          showSuccess={isSubmitSuccessful}
          type="submit"
        />
        <Button
          color="info"
          variant="contained"
          onClick={() => setViewRawCheats((prevState) => !prevState)}
        >
          {viewRawCheats ? 'Parsed' : 'Raw'}
        </Button>
        <Button variant="outlined" onClick={() => setIsModalOpen(false)}>
          Close
        </Button>
      </ModalFooter>
    </>
  );
};
