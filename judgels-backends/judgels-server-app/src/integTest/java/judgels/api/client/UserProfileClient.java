package judgels.api.client;

import feign.Param;
import feign.RequestLine;
import judgels.api.user.profile.BasicProfile;
import judgels.api.user.profile.Profile;
import judgels.persistence.api.Page;

public interface UserProfileClient {
    @RequestLine("GET /api/v2/profiles/top")
    Page<Profile> getTopRatedProfiles();

    @RequestLine("GET /api/v2/profiles/{userJid}/basic")
    BasicProfile getBasicProfile(@Param("userJid") String userJid);
}
