import { Button, keyframes } from '@mui/material';
import { styled } from '@mui/material/styles';
import { useId, useState } from 'react';

import { useInterval } from '../../hooks/use-interval.ts';

import type { ButtonProps } from '@mui/material';

type CircleCheckButtonProps = {
  copy: string;
  msDuration?: number;
  showSuccess?: boolean;
} & Omit<ButtonProps, 'children'>;

type CopyWrapperProps = {
  $isSuccessCheckVisible: boolean;
};

const stroke = keyframes`
  100% {
    stroke-dashoffset: 0;
  }
`;

const scale = keyframes`
  0%,
  100% {
    transform: none;
  }
  50% {
    transform: scale3d(1.1, 1.1, 1);
  }
`;

const fill = keyframes`
  100% {
    box-shadow: inset 0 0 0 100vh var(--checkmark-fill-color);
  }
`;

const StyledSvg = styled('svg')`
  position: absolute;
  width: 24px;
  height: 24px;

  display: block;
  margin-left: auto;
  margin-right: auto;
  border-radius: 50%;
  stroke: ${({ theme }) => theme.pureWhite};
  stroke-width: 5;
  stroke-miterlimit: 10;
  animation: ${fill} 0.2s ease-in-out 0.2s forwards,
    ${scale} 0.12s ease-in-out 0.45s both;
`;

const CheckCircle = styled('circle')`
  stroke-dasharray: 166;
  stroke-dashoffset: 166;
  stroke-width: 5;
  stroke-miterlimit: 10;
  stroke: ${({ theme }) => theme.checkMarkGreen};
  fill: none;
  animation: ${stroke} 0.3s cubic-bezier(0.65, 0, 0.45, 1) forwards;
`;

const CheckPath = styled('path')`
  transform-origin: 50% 50%;
  stroke-dasharray: 48;
  stroke-dashoffset: 48;
  animation: ${stroke} 0.15s cubic-bezier(0.65, 0, 0.45, 1) 0.4s forwards;
`;

const CopyWrapper = styled('span')<CopyWrapperProps>`
  ${({ $isSuccessCheckVisible = false }) =>
    $isSuccessCheckVisible && 'visibility: hidden;'}
`;

export const CircleCheckButton = ({
  copy,
  msDuration = 1100,
  onClick,
  showSuccess = true,
  ...rest
}: CircleCheckButtonProps) => {
  const labeledById = useId();
  const [isClicked, setIsClicked] = useState(false);

  const showSuccessAnimation = !!showSuccess && isClicked;

  useInterval(
    () => setIsClicked(false),
    showSuccessAnimation ? msDuration : null
  );

  return (
    <Button
      onClick={(e) => {
        setIsClicked(true);
        onClick?.(e);
      }}
      variant="contained"
      {...rest}
    >
      {showSuccessAnimation && (
        <StyledSvg
          role="graphics-symbol"
          aria-labelledby={labeledById}
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 52 52"
        >
          <title id={labeledById}>Circle Check</title>
          <CheckCircle cx="26" cy="26" r="25" fill="none" />
          <CheckPath fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8" />
        </StyledSvg>
      )}
      <CopyWrapper $isSuccessCheckVisible={showSuccessAnimation}>
        {copy}
      </CopyWrapper>
    </Button>
  );
};
