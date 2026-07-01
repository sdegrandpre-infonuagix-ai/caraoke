import type { Env } from '../../config/env.js';

export interface FirehoseClient {
  putRecord(streamName: string, data: object): Promise<void>;
}

class LiveFirehoseClient implements FirehoseClient {
  async putRecord(streamName: string, data: object): Promise<void> {
    const { FirehoseClient: AwsFirehoseClient, PutRecordCommand } = await import(
      '@aws-sdk/client-firehose'
    );
    const client = new AwsFirehoseClient({});
    await client.send(
      new PutRecordCommand({
        DeliveryStreamName: streamName,
        Record: { Data: Buffer.from(JSON.stringify(data) + '\n') },
      }),
    );
  }
}

class MockFirehoseClient implements FirehoseClient {
  async putRecord(streamName: string, data: object): Promise<void> {
    // Intentionally silent in test/dev — avoids noise in test output.
    void streamName;
    void data;
  }
}

export function getFirehoseClient(env: Env): FirehoseClient {
  return env.CARAOKE_INTEGRATIONS === 'live' ? new LiveFirehoseClient() : new MockFirehoseClient();
}
