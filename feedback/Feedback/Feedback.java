package org.example.Feature.Feedback;

import javax.swing.*;

public class Feedback {
    public static void main(String[] args) {
        SwingUtilities.invokeLater(() -> {
            try {
                UIManager.setLookAndFeel(UIManager.getSystemLookAndFeelClassName());
            } catch (Exception e) {
                e.printStackTrace();
            }
            new FeedbackController();
        });
    }
}
