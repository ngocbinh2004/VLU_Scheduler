import { ConnectionOptions, DefaultJobOptions } from 'bullmq';

export const BULL_CONFIG_OPTION = 'BULL_CONFIG_OPTION';

export class BullOptions {
  connectionOption: ConnectionOptions;
  defaultConnectionOptions: DefaultJobOptions;
}
