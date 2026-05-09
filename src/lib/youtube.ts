import { google, youtube_v3 } from 'googleapis';
import { prisma } from './prisma';

export async function getYoutubeClient(userId: string): Promise<youtube_v3.Youtube> {
  const account = await prisma.account.findFirst({
    where: { userId, provider: 'google' },
  });
  
  if (!account?.access_token) {
    throw new Error('No YouTube access token found for user');
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );

  oauth2Client.setCredentials({
    access_token: account.access_token,
    refresh_token: account.refresh_token ?? undefined,
    expiry_date: account.expires_at ? account.expires_at * 1000 : undefined,
  });

  // Auto-refresh logic
  oauth2Client.on('tokens', async (tokens) => {
    if (tokens.access_token) {
      await prisma.account.updateMany({
        where: { userId, provider: 'google' },
        data: {
          access_token: tokens.access_token,
          expires_at: tokens.expiry_date ? Math.floor(tokens.expiry_date / 1000) : null,
          refresh_token: tokens.refresh_token ?? account.refresh_token,
        },
      });
    }
  });

  return google.youtube({ version: 'v3', auth: oauth2Client });
}
