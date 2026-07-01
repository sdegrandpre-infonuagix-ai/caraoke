import type { Pool } from 'pg';
import { getPool } from '../../db/pool.js';

export interface BillingRecord {
  userId: string;
  stripeCustomerId: string;
  subscriptionId: string | null;
  subscriptionStatus: string | null;
  currentPeriodEnd: Date | null;
}

export interface BillingRepository {
  findByUserId(userId: string): Promise<BillingRecord | null>;
  /** Idempotently record the Stripe customer ID for a user. */
  upsertCustomer(userId: string, stripeCustomerId: string): Promise<void>;
  saveSubscription(
    userId: string,
    subscriptionId: string,
    status: string,
    currentPeriodEnd: Date,
  ): Promise<void>;
}

export class PgBillingRepository implements BillingRepository {
  constructor(private readonly pool?: Pool) {}

  private db(): Pool {
    return this.pool ?? getPool();
  }

  async findByUserId(userId: string): Promise<BillingRecord | null> {
    const { rows } = await this.db().query<{
      user_id: string;
      stripe_customer_id: string;
      subscription_id: string | null;
      subscription_status: string | null;
      current_period_end: Date | null;
    }>(
      `SELECT user_id, stripe_customer_id, subscription_id, subscription_status, current_period_end
       FROM stripe_customers WHERE user_id = $1`,
      [userId],
    );
    const r = rows[0];
    if (!r) return null;
    return {
      userId: r.user_id,
      stripeCustomerId: r.stripe_customer_id,
      subscriptionId: r.subscription_id,
      subscriptionStatus: r.subscription_status,
      currentPeriodEnd: r.current_period_end,
    };
  }

  async upsertCustomer(userId: string, stripeCustomerId: string): Promise<void> {
    await this.db().query(
      `INSERT INTO stripe_customers (user_id, stripe_customer_id)
       VALUES ($1, $2)
       ON CONFLICT (user_id) DO UPDATE
         SET stripe_customer_id = EXCLUDED.stripe_customer_id,
             updated_at = now()`,
      [userId, stripeCustomerId],
    );
  }

  async saveSubscription(
    userId: string,
    subscriptionId: string,
    status: string,
    currentPeriodEnd: Date,
  ): Promise<void> {
    await this.db().query(
      `UPDATE stripe_customers
       SET subscription_id = $2,
           subscription_status = $3,
           current_period_end = $4,
           updated_at = now()
       WHERE user_id = $1`,
      [userId, subscriptionId, status, currentPeriodEnd],
    );
  }
}
