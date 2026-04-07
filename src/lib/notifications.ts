import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

export type NotificationType = 'info' | 'success' | 'warning' | 'error';

export async function sendNotification(userId: string, title: string, message: string, type: NotificationType = 'info', link?: string) {
  try {
    await addDoc(collection(db, 'notifications'), {
      userId,
      title,
      message,
      type,
      read: false,
      createdAt: serverTimestamp(),
      link: link || null
    });
  } catch (error) {
    console.error('Error sending notification:', error);
  }
}

export async function notifyAdmins(title: string, message: string, type: NotificationType = 'info', link?: string) {
  // This would ideally fetch all admins and send notifications to each.
  // For now, we'll just log it or implement a simple version if we have the user list.
  // Since we don't want to fetch all users here, we might need a different approach for "global" admin notifications
  // or just send to the current user if they are an admin as a test.
}
