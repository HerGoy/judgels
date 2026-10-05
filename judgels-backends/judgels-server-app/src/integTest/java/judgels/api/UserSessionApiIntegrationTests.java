package judgels.api;

import static org.assertj.core.api.Assertions.assertThat;

import judgels.BaseJudgelsApiIntegrationTests;
import judgels.api.client.UserClient;
import judgels.api.client.UserSessionClient;
import judgels.api.user.User;
import judgels.api.user.session.Credentials;
import judgels.api.user.session.Session;
import org.junit.jupiter.api.Test;

public class UserSessionApiIntegrationTests extends BaseJudgelsApiIntegrationTests {
    private final UserSessionClient userSessionClient = createClient(UserSessionClient.class);
    private final UserClient userClient = createClient(UserClient.class);

    @Test
    void login_logout() {
        // log in to nonexistent user
        Credentials credentials = Credentials.of("andi", "pass");
        assertForbidden(() -> userSessionClient.logIn(credentials));

        User user = createUser("andi");

        // log in with wrong password
        assertForbidden(() -> userSessionClient.logIn(Credentials.of("andi", "wrong")));

        // log in with correct password
        Session session = userSessionClient.logIn(credentials);
        assertThat(session.getUserJid()).isEqualTo(user.getJid());

        String token = session.getToken();
        assertThat(token).isNotEmpty();

        // assert that session token is valid
        assertPermitted(() -> userClient.getUser(token, user.getJid()));

        String anotherToken = userSessionClient.logIn(credentials).getToken();

        // assert that session tokens are unique
        assertThat(token).isNotEqualTo(anotherToken);

        userSessionClient.logOut(session.getToken());

        // assert that session token is not valid anymore
        assertUnauthorized(() -> userClient.getUser(token, user.getJid()));

        // log in with email
        assertPermitted(() -> userSessionClient.logIn(Credentials.of(user.getEmail(), "pass")));
    }
}
