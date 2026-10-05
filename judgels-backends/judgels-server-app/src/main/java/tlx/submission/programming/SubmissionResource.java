package tlx.submission.programming;

import static com.google.common.base.Preconditions.checkNotNull;
import static jakarta.ws.rs.core.HttpHeaders.AUTHORIZATION;
import static jakarta.ws.rs.core.MediaType.APPLICATION_JSON;
import static jakarta.ws.rs.core.MediaType.MULTIPART_FORM_DATA;
import static judgels.service.ServiceUtils.buildDarkImageResponseFromText;
import static judgels.service.ServiceUtils.buildLightImageResponseFromText;
import static judgels.service.ServiceUtils.checkAllowed;
import static judgels.service.ServiceUtils.checkFound;

import com.google.common.collect.Lists;
import com.google.common.collect.Sets;
import io.dropwizard.hibernate.UnitOfWork;
import jakarta.inject.Inject;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.HeaderParam;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.QueryParam;
import jakarta.ws.rs.core.Response;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import judgels.api.problem.ProblemInfo;
import judgels.api.problem.programming.ProblemSubmissionConfig;
import judgels.api.profile.Profile;
import judgels.api.submission.SubmissionConfig;
import judgels.api.submission.programming.Submission;
import judgels.api.submission.programming.SubmissionData;
import judgels.api.submission.programming.SubmissionWithSource;
import judgels.api.submission.programming.SubmissionWithSourceResponse;
import judgels.grading.api.GradingOptions;
import judgels.grading.api.SubmissionSource;
import judgels.persistence.api.CursorPage;
import judgels.persistence.dao.ChapterProblemDao;
import judgels.persistence.dao.ProblemSetProblemDao;
import judgels.persistence.model.ChapterProblemModel;
import judgels.persistence.model.ProblemSetProblemModel;
import judgels.problem.ProblemService;
import judgels.problem.ProblemUtils;
import judgels.profile.ProfileStore;
import judgels.service.actor.ActorChecker;
import judgels.service.api.actor.AuthHeader;
import judgels.submission.SubmissionRoleChecker;
import judgels.submission.SubmissionUtils;
import judgels.submission.programming.SubmissionClient;
import judgels.submission.programming.SubmissionRegrader;
import judgels.submission.programming.SubmissionSourceBuilder;
import judgels.submission.programming.SubmissionStore;
import judgels.user.UserStore;
import org.glassfish.jersey.media.multipart.FormDataMultiPart;
import tlx.api.chapter.Chapter;
import tlx.api.chapter.problem.ChapterProblem;
import tlx.api.problemset.ProblemSet;
import tlx.api.problemset.problem.ProblemSetProblem;
import tlx.api.submission.programming.TrainingSubmissionsResponse;
import tlx.chapter.ChapterStore;
import tlx.chapter.problem.ChapterProblemStore;
import tlx.problemset.ProblemSetStore;
import tlx.problemset.problem.ProblemSetProblemStore;
import tlx.training.submission.programming.TrainingSubmissionClient;
import tlx.training.submission.programming.TrainingSubmissionRegrader;
import tlx.training.submission.programming.TrainingSubmissionSourceBuilder;
import tlx.training.submission.programming.TrainingSubmissionStore;

@Path("/api/v2/submissions/programming")
public class SubmissionResource {
    private static final int PAGE_SIZE = 20;

    @Inject protected ActorChecker actorChecker;
    @Inject @TrainingSubmissionStore protected SubmissionStore submissionStore;
    @Inject @TrainingSubmissionSourceBuilder protected SubmissionSourceBuilder submissionSourceBuilder;
    @Inject @TrainingSubmissionClient protected SubmissionClient submissionClient;
    @Inject @TrainingSubmissionRegrader protected SubmissionRegrader submissionRegrader;
    @Inject protected SubmissionRoleChecker submissionRoleChecker;
    @Inject protected ProfileStore profileStore;
    @Inject protected UserStore userStore;
    @Inject protected ProblemService problemService;

    @Inject protected ProblemSetStore problemSetStore;
    @Inject protected ProblemSetProblemStore problemSetProblemStore;

    @Inject protected ChapterStore chapterStore;
    @Inject protected ChapterProblemStore chapterProblemStore;

    @Inject protected ProblemSetProblemDao problemSetProblemDao;
    @Inject protected ChapterProblemDao chapterProblemDao;

    @Inject public SubmissionResource() {}

    @GET
    @Produces(APPLICATION_JSON)
    @UnitOfWork(readOnly = true)
    public TrainingSubmissionsResponse getSubmissions(
            @HeaderParam(AUTHORIZATION) Optional<AuthHeader> authHeader,
            @QueryParam("containerJid") Optional<String> containerJid,
            @QueryParam("username") Optional<String> username,
            @QueryParam("problemJid") Optional<String> problemJid,
            @QueryParam("problemAlias") Optional<String> problemAlias,
            @QueryParam("beforeId") Optional<Long> beforeId,
            @QueryParam("afterId") Optional<Long> afterId) {

        String actorJid = actorChecker.check(authHeader);

        boolean canManage = submissionRoleChecker.canManage(actorJid);

        CursorPage<Submission> submissions = submissionStore.getSubmissionsCursor(
                containerJid,
                byUserJid(username),
                byProblemJid(containerJid, problemJid, problemAlias),
                beforeId,
                afterId,
                PAGE_SIZE);

        var containerJids = Lists.transform(submissions.getPage(), Submission::getContainerJid);
        var userJids = Lists.transform(submissions.getPage(), Submission::getUserJid);
        var problemJids = Lists.transform(submissions.getPage(), Submission::getProblemJid);
        if (containerJid.isPresent() && SubmissionUtils.isChapter(containerJid.get())) {
            problemJids = chapterProblemStore.getProgrammingProblemJids(containerJid.get());
        }

        Map<String, Profile> profilesMap = profileStore.getProfiles(userJids);

        SubmissionConfig config = new SubmissionConfig.Builder()
                .canManage(canManage)
                .problemJids(problemJids)
                .build();

        Map<String, String> problemAliasesMap = new HashMap<>();
        if (!containerJid.isPresent() || SubmissionUtils.isProblemSet(containerJid.get())) {
            problemAliasesMap.putAll(problemSetProblemStore.getProblemAliasesByJids(problemJids));
        }
        if (!containerJid.isPresent() || SubmissionUtils.isChapter(containerJid.get())) {
            problemAliasesMap.putAll(chapterProblemStore.getProblemAliasesByJids(problemJids));
        }

        Map<String, String> problemNamesMap = new HashMap<>();
        if (!containerJid.isPresent()) {
            problemNamesMap = problemService.getProblemNames(problemJids, Optional.empty());
        }

        Map<String, String> containerNamesMap = new HashMap<>();
        if (!containerJid.isPresent()) {
            containerNamesMap.putAll(problemSetStore.getProblemSetNamesByJids(containerJids));
            containerNamesMap.putAll(chapterStore.getChapterNamesByJids(containerJids));
        }

        Map<String, List<String>> containerPathsMap = new HashMap<>();
        if (!containerJid.isPresent()) {
            containerPathsMap.putAll(problemSetStore.getProblemSetPathsByJids(containerJids));
            containerPathsMap.putAll(chapterStore.getChapterPathsByJids(containerJids));
        }

        // Resolve container info for submissions whose container is deleted, moved, or unmapped
        for (Submission submission : submissions.getPage()) {
            String sContainerJid = submission.getContainerJid();
            String sProblemJid = submission.getProblemJid();
            if (!containerPathsMap.containsKey(sContainerJid) || containerPathsMap.get(sContainerJid).isEmpty()) {
                List<ProblemSetProblemModel> psps = problemSetProblemDao.selectAllByProblemJid(sProblemJid);
                boolean resolved = false;
                for (ProblemSetProblemModel psp : psps) {
                    Optional<ProblemSet> maybePs = problemSetStore.getProblemSetByJid(psp.problemSetJid);
                    if (maybePs.isPresent()) {
                        ProblemSet ps = maybePs.get();
                        List<String> path = problemSetStore.getProblemSetPathByJid(ps.getJid())
                                .orElse(List.of(ps.getSlug()));
                        containerNamesMap.put(sContainerJid, ps.getName());
                        containerPathsMap.put(sContainerJid, path);
                        problemAliasesMap.put(sContainerJid + "-" + sProblemJid, psp.alias);
                        problemAliasesMap.put(sProblemJid, psp.alias);
                        resolved = true;
                        break;
                    }
                }
                if (!resolved) {
                    Optional<ChapterProblemModel> maybeCp = chapterProblemDao.selectByProblemJid(sProblemJid);
                    if (maybeCp.isPresent()) {
                        ChapterProblemModel cp = maybeCp.get();
                        Optional<Chapter> maybeCh = chapterStore.getChapterByJid(cp.chapterJid);
                        if (maybeCh.isPresent()) {
                            Chapter ch = maybeCh.get();
                            List<String> path = chapterStore.getChapterPathByJid(ch.getJid()).orElse(List.of());
                            containerNamesMap.put(sContainerJid, ch.getName());
                            containerPathsMap.put(sContainerJid, path);
                            problemAliasesMap.put(sContainerJid + "-" + sProblemJid, cp.alias);
                            problemAliasesMap.put(sProblemJid, cp.alias);
                        }
                    }
                }
            } else {
                String alias = problemAliasesMap.get(sContainerJid + "-" + sProblemJid);
                if (alias != null) {
                    problemAliasesMap.putIfAbsent(sProblemJid, alias);
                }
            }
        }

        return new TrainingSubmissionsResponse.Builder()
                .data(submissions)
                .config(config)
                .profilesMap(profilesMap)
                .problemAliasesMap(problemAliasesMap)
                .problemNamesMap(problemNamesMap)
                .containerNamesMap(containerNamesMap)
                .containerPathsMap(containerPathsMap)
                .build();
    }

    @GET
    @Path("/{submissionJid}")
    @Produces(APPLICATION_JSON)
    @UnitOfWork(readOnly = true)
    public Submission getSubmission(@PathParam("submissionJid") String submissionJid) {
        return checkFound(submissionStore.getSubmissionByJid(submissionJid));
    }

    @GET
    @Path("/id/{submissionId}")
    @Produces(APPLICATION_JSON)
    @UnitOfWork(readOnly = true)
    public SubmissionWithSourceResponse getSubmissionWithSourceById(
            @HeaderParam(AUTHORIZATION) Optional<AuthHeader> authHeader,
            @PathParam("submissionId") long submissionId,
            @QueryParam("language") Optional<String> language) {

        String actorJid = actorChecker.check(authHeader);
        Submission submission = checkFound(submissionStore.getSubmissionById(submissionId));

        String containerJid = submission.getContainerJid();
        String problemJid = submission.getProblemJid();
        String userJid = submission.getUserJid();

        List<String> containerPath = List.of();
        String containerName = "-";
        String problemAlias = "-";
        Optional<String> reasonNotAllowedToViewSource = Optional.empty();

        if (SubmissionUtils.isProblemSet(containerJid)) {
            Optional<ProblemSet> maybeProblemSet = problemSetStore.getProblemSetByJid(containerJid);
            if (maybeProblemSet.isPresent()) {
                ProblemSet problemSet = maybeProblemSet.get();
                Optional<ProblemSetProblem> maybeProblem = problemSetProblemStore.getProblem(problemSet.getJid(), problemJid);
                containerPath = problemSetStore.getProblemSetPathByJid(containerJid).orElse(List.of());
                containerName = problemSet.getName();
                problemAlias = maybeProblem.map(ProblemSetProblem::getAlias).orElse("-");
                reasonNotAllowedToViewSource = submissionRoleChecker.canViewProblemSetSource(actorJid, userJid, problemJid);
            }
        } else {
            Optional<Chapter> maybeChapter = chapterStore.getChapterByJid(containerJid);
            if (maybeChapter.isPresent()) {
                Chapter chapter = maybeChapter.get();
                Optional<ChapterProblem> maybeProblem = chapterProblemStore.getProblem(problemJid);
                containerPath = chapterStore.getChapterPathByJid(containerJid).orElse(List.of());
                containerName = chapter.getName();
                problemAlias = maybeProblem.map(ChapterProblem::getAlias).orElse("-");
                reasonNotAllowedToViewSource = submissionRoleChecker.canViewChapterSource(actorJid, userJid, problemJid);
            }
        }

        // Fallback: If container was deleted or not resolved, look up where problemJid currently lives
        if (containerPath.isEmpty()) {
            List<ProblemSetProblemModel> psps = problemSetProblemDao.selectAllByProblemJid(problemJid);
            for (ProblemSetProblemModel psp : psps) {
                Optional<ProblemSet> maybePs = problemSetStore.getProblemSetByJid(psp.problemSetJid);
                if (maybePs.isPresent()) {
                    ProblemSet ps = maybePs.get();
                    containerPath = problemSetStore.getProblemSetPathByJid(ps.getJid()).orElse(List.of(ps.getSlug()));
                    containerName = ps.getName();
                    problemAlias = psp.alias;
                    reasonNotAllowedToViewSource = submissionRoleChecker.canViewProblemSetSource(actorJid, userJid, problemJid);
                    break;
                }
            }
        }
        if (containerPath.isEmpty()) {
            Optional<ChapterProblemModel> maybeCp = chapterProblemDao.selectByProblemJid(problemJid);
            if (maybeCp.isPresent()) {
                ChapterProblemModel cp = maybeCp.get();
                Optional<Chapter> maybeCh = chapterStore.getChapterByJid(cp.chapterJid);
                if (maybeCh.isPresent()) {
                    Chapter ch = maybeCh.get();
                    containerPath = chapterStore.getChapterPathByJid(ch.getJid()).orElse(List.of());
                    containerName = ch.getName();
                    problemAlias = cp.alias;
                    reasonNotAllowedToViewSource = submissionRoleChecker.canViewChapterSource(actorJid, userJid, problemJid);
                }
            }
        }

        if (!reasonNotAllowedToViewSource.isPresent()) {
            reasonNotAllowedToViewSource = submissionRoleChecker.canViewProblemSetSource(actorJid, userJid, problemJid);
        }

        ProblemInfo problem = problemService.getProblem(submission.getProblemJid());

        Profile profile = Optional.ofNullable(profileStore.getProfile(userJid))
                .orElseGet(() -> new Profile.Builder().username("(unknown)").build());

        SubmissionWithSource submissionWithSource;
        if (reasonNotAllowedToViewSource.isPresent()) {
            submissionWithSource = new SubmissionWithSource.Builder()
                    .submission(submission)
                    .reasonNotAllowedToViewSource(reasonNotAllowedToViewSource.get())
                    .build();
        } else {
            SubmissionSource source = submissionSourceBuilder.fromPastSubmission(submission.getJid(), true);
            submissionWithSource = new SubmissionWithSource.Builder()
                    .submission(submission)
                    .source(source)
                    .build();
        }

        String problemName = Optional.ofNullable(ProblemUtils.getProblemName(problem, language))
                .orElseGet(() -> problem.getSlug().orElse("(Deleted Problem)"));

        return new SubmissionWithSourceResponse.Builder()
                .data(submissionWithSource)
                .profile(profile)
                .problemAlias(problemAlias)
                .problemName(problemName)
                .containerPath(containerPath)
                .containerName(containerName)
                .build();
    }

    @GET
    @Path("/{submissionJid}/image")
    @Produces("image/png")
    @UnitOfWork(readOnly = true)
    public Response getSubmissionSourceImage(@PathParam("submissionJid") String submissionJid) {
        Submission submission = checkFound(submissionStore.getSubmissionByJid(submissionJid));
        String source = submissionSourceBuilder.fromPastSubmission(submission.getJid(), true).asString();

        return buildLightImageResponseFromText(source, Date.from(submission.getTime()));
    }

    @GET
    @Path("/{submissionJid}/image/dark")
    @Produces("image/png")
    @UnitOfWork(readOnly = true)
    public Response getSubmissionSourceDarkImage(@PathParam("submissionJid") String submissionJid) {
        Submission submission = checkFound(submissionStore.getSubmissionByJid(submissionJid));
        String source = submissionSourceBuilder.fromPastSubmission(submission.getJid(), true).asString();

        return buildDarkImageResponseFromText(source, Date.from(submission.getTime()));
    }

    @POST
    @Consumes(MULTIPART_FORM_DATA)
    @Produces(APPLICATION_JSON)
    @UnitOfWork
    public Submission createSubmission(@HeaderParam(AUTHORIZATION) AuthHeader authHeader, FormDataMultiPart parts) {
        actorChecker.check(authHeader);

        String containerJid = checkNotNull(parts.getField("containerJid"), "containerJid").getValue();
        String problemJid = checkNotNull(parts.getField("problemJid"), "problemJid").getValue();
        String gradingLanguage = checkNotNull(parts.getField("gradingLanguage"), "gradingLanguage").getValue();

        SubmissionData data = new SubmissionData.Builder()
                .problemJid(problemJid)
                .containerJid(containerJid)
                .gradingLanguage(gradingLanguage)
                .build();
        SubmissionSource source = submissionSourceBuilder.fromNewSubmission(parts);
        ProblemSubmissionConfig config = problemService.getProgrammingProblemSubmissionConfig(data.getProblemJid());
        GradingOptions options = new GradingOptions.Builder().shouldRevealEvaluation(true).build();
        Submission submission = submissionClient.submit(data, source, config, options);

        submissionSourceBuilder.storeSubmissionSource(submission.getJid(), source);

        return submission;
    }

    @POST
    @Path("/{submissionJid}/regrade")
    @UnitOfWork
    public void regradeSubmission(
            @HeaderParam(AUTHORIZATION) AuthHeader authHeader,
            @PathParam("submissionJid") String submissionJid) {

        String actorJid = actorChecker.check(authHeader);
        Submission submission = checkFound(submissionStore.getSubmissionByJid(submissionJid));
        checkAllowed(submissionRoleChecker.canManage(actorJid));

        ProblemSubmissionConfig config = problemService.getProgrammingProblemSubmissionConfig(submission.getProblemJid());
        submissionRegrader.regradeSubmission(submission, config);
    }

    @POST
    @Path("/regrade")
    @UnitOfWork(transactional = false)
    public void regradeSubmissions(
            @HeaderParam(AUTHORIZATION) AuthHeader authHeader,
            @QueryParam("containerJid") Optional<String> containerJid,
            @QueryParam("username") Optional<String> username,
            @QueryParam("problemJid") Optional<String> problemJid,
            @QueryParam("problemAlias") Optional<String> problemAlias) {

        String actorJid = actorChecker.check(authHeader);
        checkAllowed(submissionRoleChecker.canManage(actorJid));

        Map<String, ProblemSubmissionConfig> configsMap = new HashMap<>();

        for (int pageNumber = 1;; pageNumber++) {
            List<Submission> submissions = submissionStore.getSubmissions(
                    containerJid,
                    byUserJid(username),
                    byProblemJid(containerJid, problemJid, problemAlias),
                    pageNumber,
                    100).getPage();

            if (submissions.isEmpty()) {
                break;
            }

            var problemJids = Lists.transform(submissions, Submission::getProblemJid);
            configsMap.putAll(problemService.getProgrammingProblemSubmissionConfigs(
                    Sets.difference(Set.copyOf(problemJids), configsMap.keySet())));

            submissionRegrader.regradeSubmissions(submissions, configsMap);
        }
    }

    private Optional<String> byUserJid(Optional<String> username) {
        return username.map(u -> userStore.translateUsernameToJid(u).orElse(""));
    }

    private Optional<String> byProblemJid(
            Optional<String> containerJid,
            Optional<String> problemJid,
            Optional<String> problemAlias) {
        if (containerJid.isPresent() && problemAlias.isPresent()) {
            if (SubmissionUtils.isProblemSet(containerJid.get())) {
                return Optional.of(problemSetProblemStore
                        .getProblemByAlias(containerJid.get(), problemAlias.get())
                        .map(ProblemSetProblem::getProblemJid)
                        .orElse(""));
            }
            if (SubmissionUtils.isChapter(containerJid.get())) {
                return Optional.of(chapterProblemStore
                        .getProblemByAlias(containerJid.get(), problemAlias.get())
                        .map(ChapterProblem::getProblemJid)
                        .orElse(""));
            }
        }
        return problemJid;
    }
}
