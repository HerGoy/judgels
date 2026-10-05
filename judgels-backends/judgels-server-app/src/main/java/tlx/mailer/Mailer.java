package tlx.mailer;

import org.apache.commons.mail.DefaultAuthenticator;
import org.apache.commons.mail.EmailException;
import org.apache.commons.mail.HtmlEmail;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class Mailer {
    private static final Logger LOGGER = LoggerFactory.getLogger(Mailer.class);
    private MailerConfiguration config;

    public Mailer(MailerConfiguration config) {
        this.config = config;
    }

    public void send(String recipient, String subject, String body) {
        new Thread(() -> {
            try {
                HtmlEmail email = new HtmlEmail();
                email.setHostName(config.getHost());
                email.setSmtpPort(config.getPort());
                if (config.getUseSsl()) {
                    email.setSslSmtpPort(Integer.toString(config.getPort()));
                }
                email.setAuthenticator(new DefaultAuthenticator(config.getUsername(), config.getPassword()));
                email.setSSLOnConnect(config.getUseSsl());
                email.setFrom(config.getSender());
                email.setSubject(subject);
                email.setHtmlMsg(body);
                email.addTo(recipient);
                email.send();
                LOGGER.info("Email successfully sent to {}", recipient);
            } catch (EmailException e) {
                LOGGER.error("Failed to send email to " + recipient, e);
            }
        }).start();
    }
}
