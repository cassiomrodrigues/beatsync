import React from 'react';
import { Text, StyleSheet, Platform, View, ViewStyle } from 'react-native';

export type AppIconName =
  | 'speedometer'
  | 'speedometer-outline'
  | 'musical-notes'
  | 'musical-notes-outline'
  | 'list'
  | 'list-outline'
  | 'mic'
  | 'mic-outline'
  | 'settings'
  | 'settings-outline'
  | 'shield-checkmark'
  | 'shield-checkmark-outline'
  | 'flash'
  | 'flash-off-outline'
  | 'volume-high'
  | 'volume-mute'
  | 'time-outline'
  | 'library-outline'
  | 'close-circle'
  | 'play'
  | 'stop'
  | 'log-out-outline'
  | 'sunny'
  | 'moon';

interface AppIconProps {
  name: AppIconName;
  size?: number;
  color?: string;
  style?: ViewStyle;
}

const FALLBACK_GLYPHS: Record<AppIconName, string> = {
  speedometer: '⏱',
  'speedometer-outline': '⏱',
  'musical-notes': '♫',
  'musical-notes-outline': '♫',
  list: '☰',
  'list-outline': '☰',
  mic: '🎙',
  'mic-outline': '🎙',
  settings: '⚙',
  'settings-outline': '⚙',
  'shield-checkmark': '🛡',
  'shield-checkmark-outline': '🛡',
  flash: '⚡',
  'flash-off-outline': '⚡',
  'volume-high': '🔊',
  'volume-mute': '🔇',
  'time-outline': '◷',
  'library-outline': '♫',
  'close-circle': '✕',
  play: '▶',
  stop: '■',
  'log-out-outline': '↪',
  sunny: '☀',
  moon: '☾',
};

function renderWebSvg(name: AppIconName, size: number, color: string): React.ReactNode {
  const commonProps = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    xmlns: 'http://www.w3.org/2000/svg',
    style: { display: 'block', flexShrink: 0 },
    'aria-hidden': true,
  };

  switch (name) {
    case 'speedometer':
    case 'speedometer-outline': {
      const isFilled = name === 'speedometer';
      return React.createElement(
        'svg',
        commonProps,
        // Metronome trapezoid body
        React.createElement('path', {
          d: 'M7 21L10 4H14L17 21H7Z',
          stroke: color,
          strokeWidth: 2,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
          fill: isFilled ? `${color}26` : 'none',
        }),
        // Base line
        React.createElement('path', {
          d: 'M5 21H19',
          stroke: color,
          strokeWidth: 2,
          strokeLinecap: 'round',
        }),
        // Pendulum needle
        React.createElement('path', {
          d: 'M12 18L16.5 7.5',
          stroke: color,
          strokeWidth: 2.2,
          strokeLinecap: 'round',
        }),
        // Pivot dot
        React.createElement('circle', {
          cx: '12',
          cy: '18',
          r: '1.6',
          fill: color,
        })
      );
    }

    case 'musical-notes':
    case 'musical-notes-outline': {
      const isFilled = name === 'musical-notes';
      return React.createElement(
        'svg',
        commonProps,
        React.createElement('path', {
          d: 'M9 18V6L20 4V16',
          stroke: color,
          strokeWidth: 2,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
        }),
        React.createElement('circle', {
          cx: '6.5',
          cy: '18',
          r: '2.5',
          stroke: color,
          strokeWidth: 2,
          fill: isFilled ? color : 'none',
        }),
        React.createElement('circle', {
          cx: '17.5',
          cy: '16',
          r: '2.5',
          stroke: color,
          strokeWidth: 2,
          fill: isFilled ? color : 'none',
        })
      );
    }

    case 'list':
    case 'list-outline': {
      return React.createElement(
        'svg',
        commonProps,
        React.createElement('circle', { cx: '4.5', cy: '6.5', r: '1.5', fill: color }),
        React.createElement('circle', { cx: '4.5', cy: '12', r: '1.5', fill: color }),
        React.createElement('circle', { cx: '4.5', cy: '17.5', r: '1.5', fill: color }),
        React.createElement('path', {
          d: 'M9 6.5H20M9 12H20M9 17.5H16',
          stroke: color,
          strokeWidth: 2.2,
          strokeLinecap: 'round',
        })
      );
    }

    case 'mic':
    case 'mic-outline': {
      const isFilled = name === 'mic';
      return React.createElement(
        'svg',
        commonProps,
        React.createElement('rect', {
          x: '9',
          y: '3',
          width: '6',
          height: '11',
          rx: '3',
          stroke: color,
          strokeWidth: 2,
          fill: isFilled ? `${color}33` : 'none',
        }),
        React.createElement('path', {
          d: 'M5.5 11C5.5 14.59 8.41 17.5 12 17.5C15.59 17.5 18.5 14.59 18.5 11',
          stroke: color,
          strokeWidth: 2,
          strokeLinecap: 'round',
        }),
        React.createElement('path', {
          d: 'M12 17.5V21M8.5 21H15.5',
          stroke: color,
          strokeWidth: 2,
          strokeLinecap: 'round',
        })
      );
    }

    case 'settings':
    case 'settings-outline': {
      const isFilled = name === 'settings';
      return React.createElement(
        'svg',
        commonProps,
        React.createElement('circle', {
          cx: '12',
          cy: '12',
          r: '3.2',
          stroke: color,
          strokeWidth: 2,
          fill: isFilled ? color : 'none',
        }),
        React.createElement('path', {
          d: 'M12 2.5V5M12 19V21.5M4.22 4.22L5.99 5.99M18.01 18.01L19.78 19.78M2.5 12H5M19 12H21.5M4.22 19.78L5.99 18.01M18.01 5.99L19.78 4.22',
          stroke: color,
          strokeWidth: 2,
          strokeLinecap: 'round',
        })
      );
    }

    case 'shield-checkmark':
    case 'shield-checkmark-outline': {
      const isFilled = name === 'shield-checkmark';
      return React.createElement(
        'svg',
        commonProps,
        React.createElement('path', {
          d: 'M12 3L4.5 6.2V11.5C4.5 16.3 7.7 20.6 12 22C16.3 20.6 19.5 16.3 19.5 11.5V6.2L12 3Z',
          stroke: color,
          strokeWidth: 2,
          strokeLinejoin: 'round',
          fill: isFilled ? `${color}26` : 'none',
        }),
        React.createElement('path', {
          d: 'M9 12.2L11.1 14.3L15.2 10.2',
          stroke: color,
          strokeWidth: 2,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
        })
      );
    }

    case 'flash': {
      return React.createElement(
        'svg',
        commonProps,
        React.createElement('path', {
          d: 'M13 2L4.5 13.5H11.5L10.5 22L19.5 10.5H12.5L13 2Z',
          fill: color,
          stroke: color,
          strokeWidth: 1.5,
          strokeLinejoin: 'round',
        })
      );
    }

    case 'flash-off-outline': {
      return React.createElement(
        'svg',
        commonProps,
        React.createElement('path', {
          d: 'M13 2L6.5 10.8M10.5 22L17.5 13H12L13 2Z',
          stroke: color,
          strokeWidth: 2,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
        }),
        React.createElement('path', {
          d: 'M3.5 3.5L20.5 20.5',
          stroke: color,
          strokeWidth: 2,
          strokeLinecap: 'round',
        })
      );
    }

    case 'volume-high': {
      return React.createElement(
        'svg',
        commonProps,
        React.createElement('path', {
          d: 'M11 5L6 9H2.5V15H6L11 19V5Z',
          fill: color,
          stroke: color,
          strokeWidth: 1.6,
          strokeLinejoin: 'round',
        }),
        React.createElement('path', {
          d: 'M15.2 8.8C16.3 9.7 17 11 17 12.5C17 14 16.3 15.3 15.2 16.2M18.2 5.8C20.2 7.4 21.5 9.8 21.5 12.5C21.5 15.2 20.2 17.6 18.2 19.2',
          stroke: color,
          strokeWidth: 2,
          strokeLinecap: 'round',
        })
      );
    }

    case 'volume-mute': {
      return React.createElement(
        'svg',
        commonProps,
        React.createElement('path', {
          d: 'M11 5L6 9H2.5V15H6L11 19V5Z',
          stroke: color,
          strokeWidth: 2,
          strokeLinejoin: 'round',
        }),
        React.createElement('path', {
          d: 'M21 9.5L15.5 15M15.5 9.5L21 15',
          stroke: color,
          strokeWidth: 2.2,
          strokeLinecap: 'round',
        })
      );
    }

    case 'time-outline': {
      return React.createElement(
        'svg',
        commonProps,
        React.createElement('circle', {
          cx: '12',
          cy: '12',
          r: '9',
          stroke: color,
          strokeWidth: 2,
        }),
        React.createElement('path', {
          d: 'M12 7V12L15 14',
          stroke: color,
          strokeWidth: 2,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
        })
      );
    }

    case 'library-outline': {
      return React.createElement(
        'svg',
        commonProps,
        React.createElement('path', {
          d: 'M4 19.5V5.5C4 4.4 4.9 3.5 6 3.5H18C19.1 3.5 20 4.4 20 5.5V19.5',
          stroke: color,
          strokeWidth: 2,
          strokeLinecap: 'round',
        }),
        React.createElement('path', {
          d: 'M9 12H15M9 8.5H15',
          stroke: color,
          strokeWidth: 2,
          strokeLinecap: 'round',
        })
      );
    }

    case 'close-circle': {
      return React.createElement(
        'svg',
        commonProps,
        React.createElement('circle', {
          cx: '12',
          cy: '12',
          r: '9.5',
          fill: color,
        }),
        React.createElement('path', {
          d: 'M14.8 9.2L9.2 14.8M9.2 9.2L14.8 14.8',
          stroke: '#FFFFFF',
          strokeWidth: 2,
          strokeLinecap: 'round',
        })
      );
    }

    case 'play': {
      return React.createElement(
        'svg',
        commonProps,
        React.createElement('path', {
          d: 'M7 4.5L19.5 12L7 19.5V4.5Z',
          fill: color,
          stroke: color,
          strokeWidth: 1.5,
          strokeLinejoin: 'round',
        })
      );
    }

    case 'stop': {
      return React.createElement(
        'svg',
        commonProps,
        React.createElement('rect', {
          x: '5.5',
          y: '5.5',
          width: '13',
          height: '13',
          rx: '2',
          fill: color,
        })
      );
    }

    case 'log-out-outline': {
      return React.createElement(
        'svg',
        commonProps,
        React.createElement('path', {
          d: 'M10 4H5.5C4.67 4 4 4.67 4 5.5V18.5C4 19.33 4.67 20 5.5 20H10',
          stroke: color,
          strokeWidth: 2,
          strokeLinecap: 'round',
        }),
        React.createElement('path', {
          d: 'M15.5 8L20 12L15.5 16M9.5 12H19.5',
          stroke: color,
          strokeWidth: 2,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
        })
      );
    }

    case 'sunny': {
      return React.createElement(
        'svg',
        commonProps,
        React.createElement('circle', {
          cx: '12',
          cy: '12',
          r: '4.5',
          fill: color,
        }),
        React.createElement('path', {
          d: 'M12 2V4.5M12 19.5V22M4.93 4.93L6.7 6.7M17.3 17.3L19.07 19.07M2 12H4.5M19.5 12H22M4.93 19.07L6.7 17.3M17.3 6.7L19.07 4.93',
          stroke: color,
          strokeWidth: 2,
          strokeLinecap: 'round',
        })
      );
    }

    case 'moon': {
      return React.createElement(
        'svg',
        commonProps,
        React.createElement('path', {
          d: 'M20.2 14.8C19 15.3 17.7 15.5 16.3 15.5C11.1 15.5 6.9 11.3 6.9 6.1C6.9 4.7 7.2 3.4 7.7 2.2C4.4 3.5 2.1 6.8 2.1 10.6C2.1 15.8 6.3 20 11.5 20C15.3 20 18.6 17.7 20.2 14.8Z',
          fill: color,
        })
      );
    }
  }
}

export const AppIcon: React.FC<AppIconProps> = React.memo(
  ({ name, size = 18, color = '#FFFFFF', style }) => {
    if (Platform.OS === 'web') {
      return (
        <View
          style={[
            styles.iconWrapper,
            { width: size, height: size },
            style,
          ]}
        >
          {renderWebSvg(name, size, color)}
        </View>
      );
    }

    return (
      <Text
        style={[
          styles.nativeGlyph,
          { fontSize: size * 0.9, color, lineHeight: size },
          style as any,
        ]}
      >
        {FALLBACK_GLYPHS[name]}
      </Text>
    );
  }
);

AppIcon.displayName = 'AppIcon';

const styles = StyleSheet.create({
  iconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  nativeGlyph: {
    textAlign: 'center',
    fontWeight: '700',
  },
});
