package judgels.role;

import jakarta.inject.Inject;
import judgels.api.actor.Actor;
import judgels.api.role.ProblemAdminRole;
import judgels.api.role.UserAdminRole;
import judgels.api.user.role.UserRole;
import judgels.user.role.UserRoleStore;

public class ProblemAdminRoleChecker {
    private final UserRoleStore userRoleStore;

    @Inject
    public ProblemAdminRoleChecker(UserRoleStore userRoleStore) {
        this.userRoleStore = userRoleStore;
    }

    public boolean isAdmin(Actor actor) {
        String problemRole = actor.getRole().getProblem().orElse("");
        String accountRole = actor.getRole().getAccount().orElse("");
        return problemRole.equals(ProblemAdminRole.ADMIN.name())
                || accountRole.equals(UserAdminRole.SUPERADMIN.name())
                || accountRole.equals(UserAdminRole.ADMIN.name());
    }

    public boolean isAdmin(String userJid) {
        UserRole role = userRoleStore.getRole(userJid);
        String problemRole = role.getProblem().orElse("");
        String accountRole = role.getAccount().orElse("");
        return problemRole.equals(ProblemAdminRole.ADMIN.name())
                || accountRole.equals(UserAdminRole.SUPERADMIN.name())
                || accountRole.equals(UserAdminRole.ADMIN.name());
    }

    public boolean isWriter(Actor actor) {
        String problemRole = actor.getRole().getProblem().orElse("");
        String accountRole = actor.getRole().getAccount().orElse("");
        return problemRole.equals(ProblemAdminRole.ADMIN.name())
                || problemRole.equals("WRITER")
                || accountRole.equals(UserAdminRole.SUPERADMIN.name())
                || accountRole.equals(UserAdminRole.ADMIN.name());
    }

    public boolean isWriter(String userJid) {
        UserRole role = userRoleStore.getRole(userJid);
        String problemRole = role.getProblem().orElse("");
        String accountRole = role.getAccount().orElse("");
        return problemRole.equals(ProblemAdminRole.ADMIN.name())
                || problemRole.equals("WRITER")
                || accountRole.equals(UserAdminRole.SUPERADMIN.name())
                || accountRole.equals(UserAdminRole.ADMIN.name());
    }
}
