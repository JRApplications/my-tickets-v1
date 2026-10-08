import React from 'react';
import './Avatar.css';

interface AvatarProps {
  src?: string;
  name?: string;
  size?: number;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}

const Avatar: React.FC<AvatarProps> = ({ src, name, size = 32 }) => {
  const style = {
    width: `${size}px`,
    height: `${size}px`,
    fontSize: `${Math.round(size * 0.38)}px`,
  };

  if (src) {
    return (
      <img
        src={src}
        alt={name ? `${name} avatar` : 'Agent avatar'}
        className="cw-avatar cw-avatar--image"
        style={style}
      />
    );
  }

  return (
    <span
      className="cw-avatar cw-avatar--initials"
      aria-label={name ? `${name} avatar` : 'Agent avatar'}
      style={style}
    >
      {name ? getInitials(name) : 'A'}
    </span>
  );
};

export default Avatar;
