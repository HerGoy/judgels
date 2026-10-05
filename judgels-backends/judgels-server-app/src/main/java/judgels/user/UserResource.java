package judgels.user;

import static com.google.common.base.Preconditions.checkArgument;
import static jakarta.ws.rs.core.HttpHeaders.AUTHORIZATION;
import static jakarta.ws.rs.core.MediaType.APPLICATION_JSON;
import static jakarta.ws.rs.core.MediaType.TEXT_PLAIN;
import static judgels.service.ServiceUtils.checkAllowed;
import static judgels.service.ServiceUtils.checkFound;

import com.google.common.collect.Lists;
import com.opencsv.CSVWriterBuilder;
import com.opencsv.ICSVWriter;
import io.dropwizard.hibernate.UnitOfWork;
import jakarta.inject.Inject;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.DELETE;
import jakarta.ws.rs.DefaultValue;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.HeaderParam;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.QueryParam;
import jakarta.ws.rs.core.Response;
import java.io.IOException;
import java.io.StringWriter;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;
import judgels.api.user.User;
import judgels.api.user.UserData;
import judgels.api.user.UsersResponse;
import judgels.api.user.UsersUpsertResponse;
import judgels.persistence.api.OrderDir;
import judgels.persistence.api.Page;
import judgels.persistence.dao.UserRegistrationEmailDao;
import judgels.persistence.model.UserRegistrationEmailModel;
import judgels.service.RandomCodeGenerator;
import judgels.persistence.dao.UserDao;
import judgels.persistence.dao.UserInfoDao;
import judgels.persistence.dao.UserRoleDao;
import judgels.service.actor.ActorChecker;
import judgels.service.api.actor.AuthHeader;
import judgels.session.SessionStore;

@Path("/api/v2/users")
public class UserResource {
    private static final int PAGE_SIZE = 250;

    @Inject protected ActorChecker actorChecker;
    @Inject protected UserRoleChecker roleChecker;
    @Inject protected UserStore userStore;
    @Inject protected SessionStore sessionStore;
    @Inject protected UserCreator userCreator;
    @Inject protected UserRegistrationEmailDao userRegistrationEmailDao;
    @Inject protected UserDao userDao;
    @Inject protected UserInfoDao userInfoDao;
    @Inject protected UserRoleDao userRoleDao;

    @Inject public UserResource() {}

    @POST
    @Path("/batch-get")
    @Consumes(APPLICATION_JSON)
    @Produces(TEXT_PLAIN)
    @UnitOfWork(readOnly = true)
    public String exportUsers(
            @HeaderParam(AUTHORIZATION) Optional<AuthHeader> authHeader,
            List<String> usernames) {

        String actorJid = actorChecker.check(authHeader);
        boolean canAdminister = roleChecker.canAdminister(actorJid);

        checkArgument(usernames.size() <= 100, "Cannot get more than 100 users.");

        Map<String, User> usersMap = userStore.getUsersByUsername(Set.copyOf(usernames));
        List<User> users = usernames.stream()
                .filter(usersMap::containsKey)
                .map(usersMap::get)
                .collect(Collectors.toList());

        StringWriter csv = new StringWriter();
        ICSVWriter writer = (new CSVWriterBuilder(csv)).build();

        List<String> header = new ArrayList<>();
        header.add("username");
        header.add("jid");
        if (canAdminister) {
            header.add("email");
        }

        writer.writeNext(header.toArray(new String[0]), false);
        for (User user : users) {
            List<String> row = new ArrayList<>();
            row.add(user.getUsername());
            row.add(user.getJid());
            if (canAdminister) {
                row.add(user.getEmail());
            }
            writer.writeNext(row.toArray(new String[0]), false);
        }
        return csv.toString();
    }

    @GET
    @Path("/{userJid}")
    @Produces(APPLICATION_JSON)
    @UnitOfWork(readOnly = true)
    public User getUser(
            @HeaderParam(AUTHORIZATION) AuthHeader authHeader,
            @PathParam("userJid") String userJid) {

        String actorJid = actorChecker.check(authHeader);
        checkAllowed(roleChecker.canManage(actorJid, userJid));

        return checkFound(userStore.getUserByJid(userJid));
    }

    @GET
    @Path("/me")
    @Produces(APPLICATION_JSON)
    @UnitOfWork(readOnly = true)
    public User getMyself(@HeaderParam(AUTHORIZATION) AuthHeader authHeader) {
        String actorJid = actorChecker.check(authHeader);
        return checkFound(userStore.getUserByJid(actorJid));
    }

    @GET
    @Produces(APPLICATION_JSON)
    @UnitOfWork(readOnly = true)
    public UsersResponse getUsers(
            @HeaderParam(AUTHORIZATION) AuthHeader authHeader,
            @QueryParam("orderBy") Optional<String> orderBy,
            @QueryParam("orderDir") Optional<OrderDir> orderDir,
            @QueryParam("page") @DefaultValue("1") int pageNumber) {

        String actorJid = actorChecker.check(authHeader);
        checkAllowed(roleChecker.canAdminister(actorJid));

        Page<User> users = userStore.getUsers(pageNumber, PAGE_SIZE, orderBy, orderDir);

        var userJids = Lists.transform(users.getPage(), User::getJid);
        Map<String, Instant> lastSessionTimesMap = sessionStore.getLatestSessionTimeByUserJids(userJids);

        Map<String, Boolean> activationStatusesMap = new HashMap<>();
        for (String userJid : userJids) {
            Optional<UserRegistrationEmailModel> maybeModel = userRegistrationEmailDao.selectByUserJid(userJid);
            boolean isActivated = maybeModel.map(m -> m.verified).orElse(true);
            activationStatusesMap.put(userJid, isActivated);
        }

        return new UsersResponse.Builder()
                .data(users)
                .lastSessionTimesMap(lastSessionTimesMap)
                .activationStatusesMap(activationStatusesMap)
                .build();
    }

    @POST
    @Path("/{userJid}/activate")
    @UnitOfWork
    public void activateUser(
            @HeaderParam(AUTHORIZATION) AuthHeader authHeader,
            @PathParam("userJid") String userJid) {

        String actorJid = actorChecker.check(authHeader);
        checkAllowed(roleChecker.canAdminister(actorJid));

        Optional<UserRegistrationEmailModel> maybeModel = userRegistrationEmailDao.selectByUserJid(userJid);
        if (maybeModel.isPresent()) {
            UserRegistrationEmailModel model = maybeModel.get();
            model.verified = true;
            userRegistrationEmailDao.update(model);
        } else {
            UserRegistrationEmailModel model = new UserRegistrationEmailModel();
            model.userJid = userJid;
            model.emailCode = RandomCodeGenerator.newCode();
            model.verified = true;
            userRegistrationEmailDao.insert(model);
        }
    }

    @POST
    @Path("/{userJid}/deactivate")
    @UnitOfWork
    public void deactivateUser(
            @HeaderParam(AUTHORIZATION) AuthHeader authHeader,
            @PathParam("userJid") String userJid) {

        String actorJid = actorChecker.check(authHeader);
        checkAllowed(roleChecker.canAdminister(actorJid));

        Optional<UserRegistrationEmailModel> maybeModel = userRegistrationEmailDao.selectByUserJid(userJid);
        if (maybeModel.isPresent()) {
            UserRegistrationEmailModel model = maybeModel.get();
            model.verified = false;
            userRegistrationEmailDao.update(model);
        } else {
            UserRegistrationEmailModel model = new UserRegistrationEmailModel();
            model.userJid = userJid;
            model.emailCode = RandomCodeGenerator.newCode();
            model.verified = false;
            userRegistrationEmailDao.insert(model);
        }
        sessionStore.deleteSessionsByUserJid(userJid);
    }

    @DELETE
    @Path("/{userJid}")
    @Produces(APPLICATION_JSON)
    @UnitOfWork
    public Response deleteUser(
            @HeaderParam(AUTHORIZATION) AuthHeader authHeader,
            @PathParam("userJid") String userJid) {

        String actorJid = actorChecker.check(authHeader);
        checkAllowed(roleChecker.canAdminister(actorJid));
        checkArgument(!actorJid.equals(userJid), "Cannot delete yourself.");

        sessionStore.deleteSessionsByUserJid(userJid);
        userRegistrationEmailDao.selectByUserJid(userJid).ifPresent(userRegistrationEmailDao::delete);
        userInfoDao.selectByUserJid(userJid).ifPresent(userInfoDao::delete);
        userRoleDao.selectByUserJid(userJid).ifPresent(userRoleDao::delete);
        userDao.selectByJid(userJid).ifPresent(userDao::delete);

        return Response.ok(Map.of("success", true)).build();
    }

    @POST
    @Consumes(APPLICATION_JSON)
    @Produces(APPLICATION_JSON)
    @UnitOfWork
    public User createUser(
            @HeaderParam(AUTHORIZATION) AuthHeader authHeader,
            UserData data) {

        String actorJid = actorChecker.check(authHeader);
        checkAllowed(roleChecker.canAdminister(actorJid));

        return userStore.createUser(data);
    }

    @POST
    @Path("/batch-upsert")
    @Consumes(TEXT_PLAIN)
    @Produces(APPLICATION_JSON)
    @UnitOfWork
    public UsersUpsertResponse upsertUsers(
            @HeaderParam(AUTHORIZATION) AuthHeader authHeader,
            String csv) throws IOException {

        String actorJid = actorChecker.check(authHeader);
        checkAllowed(roleChecker.canAdminister(actorJid));

        UserCreator.UpsertUsersResult result = userCreator.upsertUsers(csv);
        if (result.errorMessage.isPresent()) {
            throw new IllegalArgumentException(result.errorMessage.get());
        }

        return new UsersUpsertResponse.Builder()
                .createdUsernames(result.createdUsernames)
                .updatedUsernames(result.updatedUsernames)
                .build();
    }

    @GET
    @Path("/username/{username}")
    @Produces(APPLICATION_JSON)
    @UnitOfWork(readOnly = true)
    public User getUserByUsername(
            @HeaderParam(AUTHORIZATION) AuthHeader authHeader,
            @PathParam("username") String username) {

        String actorJid = actorChecker.check(authHeader);
        checkAllowed(roleChecker.canAdminister(actorJid));

        return checkFound(userStore.getUserByUsername(username));
    }
}
