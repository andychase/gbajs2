import { styled } from '@mui/material/styles';

import { ButtonBase } from '../shared/custom-button-base.tsx';

import type { ReactNode } from 'react';

type NavLeafProps = {
  title: string;
  icon: ReactNode;
  $link?: string;
  $disabled?: boolean;
  $withPadding?: boolean;
  onClick?: () => void;
};

type LeafWrapperProps = {
  $disabled: boolean;
};

type NavLinkProps = {
  $withPadding: boolean;
};

type NavLeafButtonProps = {
  $withPadding: boolean;
};

const NavLeafWrapper = styled('li')<LeafWrapperProps>`
  cursor: pointer;
  color: ${({ theme }) => theme.gbaThemeBlue};
  list-style-type: none;
  padding: 0 2px;

  ${({ $disabled, theme }) =>
    $disabled &&
    `color: ${theme.disabledGray};
     pointer-events: none;
     cursor: default;
    `}

  &:hover {
    color: ${({ theme }) => theme.menuHover};
    background-color: ${({ theme }) => theme.menuHighlight};
  }
`;

const NavLeafButton = styled(ButtonBase)<NavLeafButtonProps>`
  background-color: unset;
  border: none;
  color: inherit;
  height: 100%;
  margin: 0;

  padding: 0.5rem ${({ $withPadding }) => ($withPadding ? '1rem' : '0.5rem')};

  text-align: inherit;
  width: 100%;
  cursor: pointer;
`;

const NavTitle = styled('span')`
  margin-left: 0.5rem;
`;

const NavLink = styled('a')<NavLinkProps>`
  display: block;
  text-decoration: none;
  color: unset;
  outline-offset: 0;

  padding: 0.5rem ${({ $withPadding }) => ($withPadding ? '1rem' : '0.5rem')};
`;

export const NavLeaf = ({
  title,
  icon,
  onClick,
  $link,
  $disabled = false,
  $withPadding = false
}: NavLeafProps) => {
  const commonChildren = (
    <>
      {icon}
      <NavTitle>{title}</NavTitle>
    </>
  );

  return (
    <NavLeafWrapper $disabled={$disabled}>
      {$link ? (
        <NavLink href={$link} $withPadding={$withPadding} target="_blank">
          {commonChildren}
        </NavLink>
      ) : (
        <NavLeafButton
          disabled={$disabled}
          onClick={onClick}
          $withPadding={$withPadding}
        >
          {commonChildren}
        </NavLeafButton>
      )}
    </NavLeafWrapper>
  );
};
