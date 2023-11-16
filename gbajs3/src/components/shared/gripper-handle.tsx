import { FaGripLines } from 'react-icons/fa';
import { useTheme } from 'styled-components';

type GripperHandleProps = {
  variation?: 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight';
};

export const GripperHandle = ({ variation }: GripperHandleProps) => {
  const theme = useTheme();

  const rotationDegrees = (function () {
    switch (variation) {
      case 'topLeft':
        return '-45deg';
      case 'topRight':
        return '45deg';
      case 'bottomLeft':
        return '45deg';
      case 'bottomRight':
        return '-45deg';
      default:
        return '0deg';
    }
  })();

  return (
    <FaGripLines
      color={theme.gbaThemeBlue}
      style={{ transform: `rotate(${rotationDegrees})` }}
    />
  );
};
