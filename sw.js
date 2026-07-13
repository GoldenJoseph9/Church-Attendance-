// ============================================
// SERVICE WORKER - Push Notifications
// ============================================

self.addEventListener('install', event => {
    console.log('🔔 Service Worker installed');
    event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', event => {
    console.log('🔔 Service Worker activated');
    event.waitUntil(self.clients.claim());
});

self.addEventListener('push', event => {
    let data = {};
    try {
        data = event.data.json();
    } catch {
        data = { title: 'Church App', body: 'New notification' };
    }
    
    const options = {
        body: data.body || 'New notification',
        icon: data.icon || '/favicon.ico',
        badge: '/badge.png',
        vibrate: [200, 100, 200],
        data: data.data || {},
        actions: [
            { action: 'open', title: 'Open App' },
            { action: 'dismiss', title: 'Dismiss' }
        ]
    };
    
    event.waitUntil(
        self.registration.showNotification(data.title || 'Church App', options)
    );
});

self.addEventListener('notificationclick', event => {
    event.notification.close();
    
    if (event.action === 'open' || !event.action) {
        event.waitUntil(
            clients.matchAll({ type: 'window' }).then(clientList => {
                if (clientList.length > 0) {
                    return clientList[0].focus();
                }
                return clients.openWindow('/');
            })
        );
    }
});

