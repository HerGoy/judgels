package judgels.api.user.role;

import com.fasterxml.jackson.databind.annotation.JsonDeserialize;
import java.util.List;
import java.util.Map;
import judgels.api.user.profile.Profile;
import org.immutables.value.Value;

@Value.Immutable
@JsonDeserialize(as = ImmutableUserRolesResponse.class)
public interface UserRolesResponse {
    List<UserWithRole> getData();
    Map<String, Profile> getProfilesMap();

    class Builder extends ImmutableUserRolesResponse.Builder {}
}
