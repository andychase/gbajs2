import { styled } from 'styled-components';

type ErrorWithIconProps = {
  text: string;
  icon: JSX.Element;
  className?: string;
};

const ErrorWrapper = styled.div`
  display: flex;
  align-items: center;
  gap: 5px;
`;

const ErrorText = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.errorRed};
`;

export const ErrorWithIcon = ({
  icon,
  text,
  className
}: ErrorWithIconProps) => {
  return (
    <ErrorWrapper className={className}>
      {icon}
      <ErrorText>{text}</ErrorText>
    </ErrorWrapper>
  );
};
