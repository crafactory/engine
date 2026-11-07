import type { ReactNode } from 'react';
export const settingRow = (name: string, description: string, control: ReactNode) => (
  <div className="setting-row" key={name}>
    <div>
      <strong>{name}</strong>
      <p>{description}</p>
    </div>
    {control}
  </div>
);
