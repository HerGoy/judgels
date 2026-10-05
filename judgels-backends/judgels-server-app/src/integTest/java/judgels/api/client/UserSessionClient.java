package judgels.api.client;

import feign.Headers;
import feign.Param;
import feign.RequestLine;
import judgels.api.user.session.Credentials;
import judgels.api.user.session.Session;

public interface UserSessionClient {
    @RequestLine("POST /api/v2/session/login")
    @Headers("Content-Type: application/json")
    Session logIn(Credentials credentials);

    @RequestLine("POST /api/v2/session/logout")
    @Headers("Authorization: Bearer {token}")
    void logOut(@Param("token") String token);
}
