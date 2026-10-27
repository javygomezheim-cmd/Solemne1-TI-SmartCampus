
export type Reading = {
  id: string;
  tempAvg?: number;
  humAvg?: number;
  motionEvents?: number;
  occupied?: boolean;
  samples?: number;
  comfort?: number;
  alerts?: string[];
  ts?: {
    seconds: number;
    nanoseconds?: number;
  };
};

export type DeviceConfig = {
  name?: string;
  tempMax?: number;
  humMax?: number;
  sampleIntervalSec?: number;
  version?: number;
  revoked?: boolean;
};

export type DeviceAlert = {
  title: string;
  description: string;
};
