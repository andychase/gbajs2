import { Button, IconButton, TextField, useMediaQuery } from '@mui/material';
import { useCallback, useId, useMemo, useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { BiPlus } from 'react-icons/bi';
import { CiSquareRemove } from 'react-icons/ci';
import { styled, useTheme } from 'styled-components';

import { ModalBody } from './modal-body.tsx';
import { ModalFooter } from './modal-footer.tsx';
import { ModalHeader } from './modal-header.tsx';
import { useEmulatorContext, useModalContext } from '../../hooks/context.tsx';
import {
  EmbeddedProductTour,
  type TourSteps
} from '../product-tour/embedded-product-tour.tsx';
import { CircleCheckButton } from '../shared/circle-check-button.tsx';
import { ManagedCheckbox } from '../shared/managed-checkbox.tsx';

type OptionallyHiddenProps = {
  $shouldHide: boolean;
};

type CheatsFormSeparatorProps = {
  $fullWidth?: boolean;
};

type HelpTextProps = {
  $withMargin: boolean;
};

const CheatsList = styled.ul<OptionallyHiddenProps>`
  list-style: none;
  display: ${({ $shouldHide = false }) => ($shouldHide ? 'none' : 'flex')};
  flex-direction: column;
  gap: 10px;
  padding: 10px;
  margin: 0;
  max-width: 100%;
`;

const Cheat = styled.li`
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  gap: 10px;
  align-items: center;
  border-bottom: 1px solid ${({ theme }) => theme.pattensBlue};
  padding-bottom: 10px;
  width: 100%;
`;

const StyledCiSquareRemove = styled(CiSquareRemove)`
  min-height: 40px;
  min-width: 40px;
`;

const StyledBiPlus = styled(BiPlus)`
  width: 25px;
  height: 25px;
`;

const CheatsFormSeparator = styled.div<CheatsFormSeparatorProps>`
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: ${({ $fullWidth = false }) => ($fullWidth ? '100%' : 'auto')};

  @media ${({ theme }) => theme.isLargerThanPhone} {
    flex-direction: row;
  }
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
  const theme = useTheme();
  const isLargerThanPhone = useMediaQuery(theme.isLargerThanPhone);
  const { setIsModalOpen } = useModalContext();
  const { emulator } = useEmulatorContext();
  const [viewRawCheats, setViewRawCheats] = useState(false);
  const baseId = useId();
  const defaultCheat = { desc: '', code: '', enable: false };

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

  const tourSteps: TourSteps = [
    {
      content: <p>Use this form to enter, add, and delete cheats.</p>,
      target: `#${CSS.escape(`${baseId}--cheats-form`)}`
    },
    {
      content: <p>This form field is for the name of the cheat.</p>,
      target: `#${CSS.escape(`${baseId}--name`)}`
    },
    {
      content: (
        <>
          <p>Put your cheat code into this field.</p>
          <p>Remember to separate multi-line cheats with the '+' character!</p>
        </>
      ),
      target: `#${CSS.escape(`${baseId}--cheat-code`)}`
    },
    {
      content: <p>Use the checkbox to enable/disable a cheat.</p>,
      placement: 'right',
      target: `#${CSS.escape(`${baseId}--enabled`)}`
    },
    {
      content: <p>Use the trash button to remove a cheat entirely.</p>,
      placement: 'right',
      target: `#${CSS.escape(`${baseId}--remove`)}`
    },
    {
      content: (
        <p>
          Use the <i>plus</i> button to add a new cheat.
        </p>
      ),
      target: `#${CSS.escape(`${baseId}--add-cheat`)}`
    },
    {
      content: (
        <p>
          Use the <i>Submit</i> button to save your cheats, and convert them to
          libretro format.
        </p>
      ),
      target: `#${CSS.escape(`${baseId}--submit-button`)}`
    },
    {
      content: (
        <p>
          Use this button to toggle between viewing parsed cheats or raw cheats
          in libretro file format.
        </p>
      ),
      placement: 'right',
      target: `#${CSS.escape(`${baseId}--toggle-raw-cheats`)}`
    }
  ];

  return (
    <>
      <ModalHeader title="Manage Cheats" />
      <ModalBody>
        <form
          aria-label="Cheats Form"
          id={`${baseId}--cheats-form`}
          onSubmit={handleSubmit((data) => {
            const cheatsFile = viewRawCheats
              ? new File(
                  [new Blob([data.rawCheats], { type: 'text/plain' })],
                  emulator?.getCurrentCheatsFileName() ?? 'unknown.cheats'
                )
              : emulator?.parsedCheatsToFile(data.cheats);

            if (cheatsFile)
              emulator?.uploadCheats(cheatsFile, () => {
                emulator.autoLoadCheats();
                refreshForm();
              });
          })}
        >
          <TextField
            error={!!errors?.rawCheats}
            label="Raw Libretro Cheats"
            InputLabelProps={{
              shrink: true
            }}
            multiline
            fullWidth
            minRows={6}
            variant="outlined"
            InputProps={{
              sx: {
                ['textarea']: {
                  whiteSpace: 'pre',
                  // see: https://github.com/mui/material-ui/issues/41490
                  //      remove/refactor once resolved
                  overflowX: 'auto !important'
                }
              }
            }}
            helperText={errors?.rawCheats?.message}
            style={{ display: viewRawCheats ? 'block' : 'none' }}
            {...register('rawCheats')}
          />
          <CheatsList $shouldHide={viewRawCheats}>
            {fields.map((item, index) => {
              const firstWithId = (id: string) =>
                index === 0 ? id : undefined;

              return (
                <Cheat key={item.id}>
                  <CheatsFormSeparator $fullWidth>
                    <TextField
                      id={firstWithId(`${baseId}--name`)}
                      label="Name"
                      error={!!errors?.cheats?.[index]?.desc}
                      size="small"
                      autoComplete="Name"
                      style={isLargerThanPhone ? { maxWidth: 100 } : undefined}
                      helperText={errors?.cheats?.[index]?.desc?.message}
                      {...register(`cheats.${index}.desc`, {
                        required: {
                          value: true,
                          message: 'required'
                        }
                      })}
                    />
                    <TextField
                      id={firstWithId(`${baseId}--cheat-code`)}
                      label="Cheat Code"
                      error={!!errors?.cheats?.[index]?.code}
                      size="small"
                      autoComplete="Code"
                      helperText={errors?.cheats?.[index]?.code?.message}
                      {...register(`cheats.${index}.code`, {
                        required: {
                          value: true,
                          message: 'required'
                        }
                      })}
                    />
                  </CheatsFormSeparator>

                  <CheatsFormSeparator>
                    <ManagedCheckbox
                      id={firstWithId(`${baseId}--enabled`)}
                      label="Enabled"
                      watcher={watch(`cheats.${index}.enable`)}
                      {...register(`cheats.${index}.enable`)}
                    />
                    <IconButton
                      aria-label="Delete"
                      id={firstWithId(`${baseId}--remove`)}
                      sx={{
                        padding: 0,
                        marginRight: 'auto',
                        '&:hover': { borderRadius: '10px' },
                        '&:focus': { borderRadius: '10px' },
                        '& .MuiTouchRipple-root .MuiTouchRipple-child': {
                          borderRadius: '10px'
                        }
                      }}
                      onClick={() => remove(index)}
                    >
                      <StyledCiSquareRemove />
                    </IconButton>
                  </CheatsFormSeparator>
                </Cheat>
              );
            })}
          </CheatsList>
          <RowContainer>
            <IconButton
              aria-label="Create new cheat"
              id={`${baseId}--add-cheat`}
              sx={{ padding: 0, display: viewRawCheats ? 'none' : 'flex' }}
              onClick={() => append(defaultCheat)}
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
          form={`${baseId}--cheats-form`}
          id={`${baseId}--submit-button`}
          showSuccess={isSubmitSuccessful}
          type="submit"
        />
        <Button
          id={`${baseId}--toggle-raw-cheats`}
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
      <EmbeddedProductTour
        steps={tourSteps}
        completedProductTourStepName="hasCompletedCheatsTour"
      />
    </>
  );
};
