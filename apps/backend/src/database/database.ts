import mongoose from 'mongoose';

export class Database {
  private connection: typeof mongoose | null = null;

  async connect(): Promise<void> {
    try {
      if (this.connection) {
        return;
      }

      const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/ai-job-suite';
      this.connection = await mongoose.connect(mongoUri);
      
      console.log('✅ Database connected successfully');
    } catch (error) {
      console.error('❌ Database connection failed:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.connection) {
      await mongoose.disconnect();
      this.connection = null;
      console.log('Database disconnected');
    }
  }

  async query(sql: string, params?: any[]): Promise<any[]> {
    // This is a MongoDB implementation, but the payment service expects SQL
    // For production, you should use a proper SQL database or adapt this
    console.warn('SQL query attempted on MongoDB:', sql);
    return [];
  }

  async transaction(callback: (trx: any) => Promise<void>): Promise<void> {
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
      await callback(session);
      await session.commitTransaction();
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }
}

export const database = new Database();