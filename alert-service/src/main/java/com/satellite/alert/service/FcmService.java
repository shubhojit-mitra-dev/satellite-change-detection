package com.satellite.alert.service;

import com.google.firebase.messaging.FirebaseMessaging;
import com.google.firebase.messaging.FirebaseMessagingException;
import com.google.firebase.messaging.Message;
import com.google.firebase.messaging.Notification;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Service
@Slf4j
public class FcmService {

    public void sendAlertNotification(String fcmToken, String severity, String message) {
        try {
            String title = severity.equals("CRITICAL")
                ? "Critical Alert"
                : "Positive Update";

            Message fcmMessage = Message.builder()
                .setToken(fcmToken)
                .setNotification(
                    Notification.builder()
                        .setTitle(title)
                        .setBody(message)
                        .build()
                )
                .putData("severity", severity)
                .putData("message", message)
                .build();

            String response = FirebaseMessaging.getInstance().send(fcmMessage);
            log.info("FCM notification sent successfully: {}", response);

        } catch (FirebaseMessagingException e) {
            log.error("Failed to send FCM notification: {}", e.getMessage());
        }
    }
}
