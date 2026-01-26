import { Button } from '@mui/material';
import { styled } from '@mui/material/styles';
import {
  ErrorBoundary,
  getErrorMessage,
  type FallbackProps
} from 'react-error-boundary';

import {
  BodyWrapper,
  FooterWrapper,
  Header,
  HeaderWrapper
} from './styled.tsx';

import type { ReactNode } from 'react';

const ErrorWrapper = styled('div')`
  background-color: ${({ theme }) => theme.pureWhite};
  border-radius: 4px;
  display: flex;
  flex-direction: column;
  height: fit-content;
  inset: 10px;
  margin: 25px auto auto;
  padding-top: 25px;
  max-height: 80%;
  max-width: calc(100dvw - 20px);
  padding: 0;
  touch-action: none;
  user-select: text;
  width: fit-content;

  @media ${({ theme }) => theme.isLargerThanPhone} {
    max-width: 600px;
  }
`;

const Overlay = styled('div')`
  background-color: rgba(0, 0, 0, 0.5);
  width: 100dvw;
  height: 100dvh;
  position: absolute;
`;

const CenteredHeaderWrapper = styled(HeaderWrapper)`
  justify-content: center;
`;

const PaddedBodyWrapper = styled(BodyWrapper)`
  padding: 1em 1em 0 1em;
`;

const ErrorImage = styled('img')`
  object-fit: contain;
  max-width: 100%;
`;

const CenteredFooter = styled(FooterWrapper)`
  justify-content: center;
  flex-wrap: wrap;
`;

const ImageWrapper = styled('div')`
  position: relative;
`;

const AttributionLink = styled('a')`
  font-size: 5px;
  position: absolute;
  right: 15%;
  bottom: 6%;
`;

const RightArrow = () => <span>&rarr;</span>;

const fallbackRender = ({ error, resetErrorBoundary }: FallbackProps) => (
  <Overlay data-testid="fallback-renderer">
    <ErrorWrapper role="alert">
      <CenteredHeaderWrapper>
        <Header>An irrecoverable error occurred</Header>
      </CenteredHeaderWrapper>
      <PaddedBodyWrapper>
        <ImageWrapper>
          <ErrorImage
            src="/img/error-512x512.png"
            alt="GameBoy Advance with error icon"
          />
          <AttributionLink
            target="_blank"
            href="https://www.freepik.com/free-vector/editable-text-effect-error-3d-hack-virus-font-style_21408324.htm"
          >
            Font by NACreative
          </AttributionLink>
        </ImageWrapper>
        <p style={{ color: 'red' }}>{getErrorMessage(error)}</p>
        <p>
          Please use the buttons below to copy the stack trace and create an
          issue, this helps a lot with error reporting!
        </p>
      </PaddedBodyWrapper>
      <CenteredFooter>
        <Button
          color="info"
          variant="contained"
          onClick={async () => {
            await navigator.clipboard.writeText(
              error instanceof Error
                ? (error.stack ?? 'Error had empty stack')
                : 'No stack available'
            );
          }}
        >
          Copy trace
        </Button>
        <RightArrow />
        <Button
          color="success"
          variant="contained"
          href="https://github.com/thenick775/gbajs3/issues"
          target="_blank"
        >
          Create issue
        </Button>
        <RightArrow />
        <Button
          color="secondary"
          variant="contained"
          onClick={resetErrorBoundary}
        >
          Dismiss and reset
        </Button>
      </CenteredFooter>
    </ErrorWrapper>
  </Overlay>
);

export const AppErrorBoundary = ({ children }: { children: ReactNode }) => (
  <ErrorBoundary fallbackRender={fallbackRender}>{children}</ErrorBoundary>
);
