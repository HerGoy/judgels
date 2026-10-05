package judgels.michael.problem;

import static judgels.service.ServiceUtils.checkAllowed;
import static judgels.service.ServiceUtils.checkFound;

import com.google.common.collect.ImmutableList;
import com.google.common.collect.Lists;
import io.dropwizard.hibernate.UnitOfWork;
import io.dropwizard.views.common.View;
import jakarta.inject.Inject;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.ws.rs.BeanParam;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.DefaultValue;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.QueryParam;
import jakarta.ws.rs.core.Context;
import jakarta.ws.rs.core.Response;
import static jakarta.ws.rs.core.MediaType.APPLICATION_JSON;
import static jakarta.ws.rs.core.MediaType.MULTIPART_FORM_DATA;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;
import jakarta.ws.rs.DELETE;
import jakarta.ws.rs.PUT;
import judgels.api.actor.Actor;
import judgels.api.problem.Problem;
import judgels.api.problem.ProblemSetterRole;
import judgels.api.problem.ProblemStatement;
import judgels.api.problem.ProblemType;
import judgels.api.problem.bundle.BundleItem;
import judgels.api.problem.bundle.ItemConfig;
import judgels.api.problem.bundle.ItemType;
import judgels.api.problem.bundle.MultipleChoiceItemConfig;
import judgels.api.problem.bundle.ShortAnswerItemConfig;
import judgels.api.problem.programming.ProblemSubmissionConfig;
import judgels.api.profile.Profile;
import judgels.api.resource.Partner;
import judgels.api.resource.PartnerPermission;
import judgels.problem.base.partner.ProblemPartnerStore;
import judgels.api.submission.programming.Grading;
import judgels.api.submission.programming.Submission;
import judgels.api.submission.programming.SubmissionData;
import judgels.fs.FileInfo;
import judgels.grading.api.GradingConfig;
import judgels.grading.api.GradingOptions;
import judgels.grading.api.LanguageRestriction;
import judgels.grading.api.SourceFile;
import judgels.grading.api.SubmissionSource;
import judgels.grading.engines.GradingEngineRegistry;
import judgels.grading.languages.GradingLanguageRegistry;
import judgels.michael.problem.programming.grading.LanguageRestrictionAdapter;
import judgels.michael.problem.programming.grading.config.GradingConfigAdapter;
import judgels.michael.problem.programming.grading.config.GradingConfigAdapterRegistry;
import judgels.michael.problem.programming.grading.config.GradingConfigForm;
import judgels.michael.template.HtmlTemplate;
import judgels.michael.template.SearchProblemsWidget;
import judgels.persistence.api.Page;
import judgels.problem.base.tag.ProblemTagStore;
import judgels.problem.base.version.ProblemVersionStore;
import judgels.problem.bundle.BundleProblemStore;
import judgels.problem.bundle.item.BundleItemStore;
import judgels.problem.programming.ProgrammingProblemStore;
import judgels.resource.StatementLanguageStatus;
import judgels.resource.WorldLanguageRegistry;
import judgels.service.ServiceUtils;
import judgels.persistence.dao.BundleItemSubmissionDao;
import judgels.persistence.dao.ChapterProblemDao;
import judgels.persistence.dao.ContestProblemDao;
import judgels.persistence.dao.ProblemSetProblemDao;
import judgels.persistence.dao.ProblemTagDao;
import judgels.persistence.dao.StatsUserProblemDao;
import judgels.persistence.dao.TrainingProgrammingGradingDao;
import judgels.persistence.dao.TrainingProgrammingSubmissionDao;
import judgels.submission.programming.SubmissionClient;
import judgels.submission.programming.SubmissionRegrader;
import judgels.submission.programming.SubmissionSourceBuilder;
import judgels.submission.programming.SubmissionStore;
import org.glassfish.jersey.media.multipart.FormDataContentDisposition;
import org.glassfish.jersey.media.multipart.FormDataParam;

@Path("/problems")
public class ProblemResource extends BaseProblemResource {
    private static final int PAGE_SIZE = 20;

    @Inject protected BundleProblemStore bundleProblemStore;
    @Inject protected BundleItemStore bundleItemStore;
    @Inject protected ProgrammingProblemStore programmingProblemStore;
    @Inject protected ProblemTagStore tagStore;
    @Inject protected ProblemVersionStore versionStore;
    @Inject protected SubmissionStore submissionStore;
    @Inject protected SubmissionClient submissionClient;
    @Inject protected SubmissionSourceBuilder submissionSourceBuilder;
    @Inject protected SubmissionRegrader submissionRegrader;
    @Inject protected ProblemPartnerStore partnerStore;
    @Inject protected ChapterProblemDao chapterProblemDao;
    @Inject protected ProblemSetProblemDao problemSetProblemDao;
    @Inject protected TrainingProgrammingSubmissionDao trainingProgrammingSubmissionDao;
    @Inject protected TrainingProgrammingGradingDao trainingProgrammingGradingDao;
    @Inject protected BundleItemSubmissionDao bundleItemSubmissionDao;
    @Inject protected StatsUserProblemDao statsUserProblemDao;
    @Inject protected ContestProblemDao contestProblemDao;
    @Inject protected ProblemTagDao problemTagDao;

    @Inject public ProblemResource() {}

    @GET
    @UnitOfWork(readOnly = true)
    public View listProblems(
            @Context HttpServletRequest req,
            @QueryParam("page") @DefaultValue("1") int pageNumber,
            @QueryParam("term") @DefaultValue("") String termFilter,
            @QueryParam("tags") Set<String> tagsFilter) {

        Actor actor = actorChecker.check(req);
        boolean isAdmin = roleChecker.isAdmin(actor);
        boolean isWriter = roleChecker.isWriter(actor);

        Optional<String> userJid = isAdmin ? Optional.empty() : Optional.of(actor.getUserJid());
        Page<Problem> problems = problemStore.getProblems(userJid, termFilter, tagsFilter, pageNumber, PAGE_SIZE);

        var userJids = Lists.transform(problems.getPage(), Problem::getAuthorJid);
        Map<String, Profile> profilesMap = profileStore.getProfiles(userJids);
        Map<String, Integer> tagCounts = tagStore.getTagCounts(isAdmin);

        HtmlTemplate template = newProblemsTemplate(actor);
        template.setTitle("Problems");
        if (isWriter) {
            template.addMainButton("New problem", "/problems/new");
        }
        template.setSearchProblemsWidget(new SearchProblemsWidget(pageNumber, termFilter, tagsFilter, tagCounts));
        return new ListProblemsView(template, problems, termFilter, tagsFilter, profilesMap);
    }

    @GET
    @Path("/api")
    @Produces(APPLICATION_JSON)
    @UnitOfWork(readOnly = true)
    public Response getProblemsJson(
            @Context HttpServletRequest req,
            @QueryParam("page") @DefaultValue("1") int pageNumber,
            @QueryParam("term") @DefaultValue("") String termFilter) {

        Actor actor = actorChecker.check(req);
        boolean isAdmin = roleChecker.isAdmin(actor);
        boolean isWriter = roleChecker.isWriter(actor);

        Optional<String> userJid = isAdmin ? Optional.empty() : Optional.of(actor.getUserJid());
        Page<Problem> problems = problemStore.getProblems(userJid, termFilter, Set.of(), pageNumber, 50);

        var userJids = Lists.transform(problems.getPage(), Problem::getAuthorJid);
        Map<String, Profile> profilesMap = profileStore.getProfiles(userJids);

        List<Map<String, Object>> list = new ArrayList<>();
        for (Problem p : problems.getPage()) {
            Map<String, Object> map = new HashMap<>();
            map.put("id", p.getId());
            map.put("jid", p.getJid());
            map.put("slug", p.getSlug());
            map.put("type", p.getType().name());
            map.put("additionalNote", p.getAdditionalNote());
            map.put("authorUsername", profilesMap.containsKey(p.getAuthorJid()) ? profilesMap.get(p.getAuthorJid()).getUsername() : "-");
            map.put("updatedAt", p.getLastUpdateTime() != null ? p.getLastUpdateTime().toEpochMilli() : null);
            map.put("canEdit", roleChecker.canEdit(actor, p));
            map.put("canDelete", roleChecker.isAuthorOrAbove(actor, p));
            list.add(map);
        }

        Map<String, Object> res = new HashMap<>();
        res.put("problems", list);
        res.put("totalCount", problems.getTotalCount());
        res.put("pageNumber", problems.getPageNumber());
        res.put("pageSize", problems.getPageSize());
        res.put("canCreate", isAdmin || isWriter);
        return Response.ok(res).build();
    }

    @POST
    @Path("/api")
    @Consumes(APPLICATION_JSON)
    @Produces(APPLICATION_JSON)
    @UnitOfWork
    public Response createProblemJson(
            @Context HttpServletRequest req,
            Map<String, String> body) {

        Actor actor = actorChecker.check(req);
        checkAllowed(roleChecker.isWriter(actor));

        String slug = body.get("slug");
        String additionalNote = body.getOrDefault("additionalNote", "");
        String gradingEngine = body.getOrDefault("gradingEngine", "Batch");
        String initialLanguage = body.getOrDefault("initialLanguage", "en-US");

        if (slug == null || slug.trim().isEmpty()) {
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity(Map.of("message", "Slug is required."))
                    .build();
        }

        if (problemStore.problemExistsBySlug(slug)) {
            return Response.status(Response.Status.CONFLICT)
                    .entity(Map.of("message", "Slug already exists."))
                    .build();
        }

        ProblemType type = "Bundle".equalsIgnoreCase(gradingEngine) ? ProblemType.BUNDLE : ProblemType.PROGRAMMING;
        Problem problem = problemStore.createProblem(type, slug, additionalNote);

        statementStore.initStatements(problem.getJid(), type, initialLanguage);

        if (type == ProblemType.BUNDLE) {
            bundleProblemStore.initBundleProblem(problem.getJid());
        } else {
            programmingProblemStore.initProgrammingProblem(problem.getJid(), gradingEngine);
            tagStore.refreshDerivedTags(problem.getJid());
        }

        problemStore.initRepository(actor.getUserJid(), problem.getJid());

        Map<String, Object> res = new HashMap<>();
        res.put("id", problem.getId());
        res.put("jid", problem.getJid());
        res.put("slug", problem.getSlug());
        res.put("type", problem.getType().name());
        return Response.ok(res).build();
    }

    private Optional<Problem> findProblem(String problemIdOrSlug) {
        try {
            int id = Integer.parseInt(problemIdOrSlug);
            Optional<Problem> p = problemStore.getProblemById(id);
            if (p.isPresent()) return p;
        } catch (NumberFormatException ignored) {}
        Optional<Problem> p = problemStore.getProblemBySlug(problemIdOrSlug);
        if (p.isPresent()) return p;
        return problemStore.getProblemByJid(problemIdOrSlug);
    }

    @GET
    @Path("/api/{problemId}")
    @Produces(APPLICATION_JSON)
    @UnitOfWork(readOnly = true)
    public Response getProblemDetailJson(
            @Context HttpServletRequest req,
            @PathParam("problemId") String problemId,
            @QueryParam("lang") String requestedLang) {

        Actor actor = actorChecker.check(req);
        Problem problem = checkFound(findProblem(problemId));
        checkAllowed(roleChecker.canView(actor, problem));

        Profile authorProfile = profileStore.getProfile(problem.getAuthorJid());

        Map<ProblemSetterRole, List<String>> setters = problemStore.getProblemSetters(problem.getJid());
        Map<String, Profile> profilesMap = profileStore.getProfiles(setters.values()
                .stream()
                .flatMap(List::stream)
                .collect(Collectors.toSet()));

        String writerUsernames = userJidsToUsernames(setters.get(ProblemSetterRole.WRITER), profilesMap);
        String developerUsernames = userJidsToUsernames(setters.get(ProblemSetterRole.DEVELOPER), profilesMap);
        String testerUsernames = userJidsToUsernames(setters.get(ProblemSetterRole.TESTER), profilesMap);
        String editorialistUsernames = userJidsToUsernames(setters.get(ProblemSetterRole.EDITORIALIST), profilesMap);

        List<String> tags = tagStore.findTopicTags(problem.getJid()).stream().sorted().collect(Collectors.toList());

        boolean canEdit = roleChecker.canEdit(actor, problem);
        boolean canSubmit = !roleChecker.canSubmit(actor, problem).isPresent();
        boolean hasLocalChanges = problemStore.userCloneExists(actor.getUserJid(), problem.getJid());

        // Statements
        Map<String, StatementLanguageStatus> availableLanguages = statementStore.getStatementAvailableLanguages(actor.getUserJid(), problem.getJid());
        String defaultLanguage = statementStore.getStatementDefaultLanguage(actor.getUserJid(), problem.getJid());
        String currentLanguage = (requestedLang != null && !requestedLang.isEmpty()) ? requestedLang : defaultLanguage;
        if (currentLanguage == null || currentLanguage.isEmpty()) {
            currentLanguage = "en-US";
        }

        ProblemStatement statement;
        try {
            statement = statementStore.getStatement(actor.getUserJid(), problem.getJid(), currentLanguage);
        } catch (Exception e) {
            statement = new ProblemStatement.Builder().title("").text("").build();
        }

        Map<String, Object> statementData = new HashMap<>();
        statementData.put("title", statement != null ? statement.getTitle() : "");
        statementData.put("text", statement != null ? statement.getText() : "");
        statementData.put("currentLanguage", currentLanguage);
        statementData.put("defaultLanguage", defaultLanguage);

        List<Map<String, Object>> languagesList = new ArrayList<>();
        Map<String, String> worldLanguages = WorldLanguageRegistry.getInstance().getLanguages();
        for (Map.Entry<String, StatementLanguageStatus> entry : availableLanguages.entrySet()) {
            Map<String, Object> langMap = new HashMap<>();
            langMap.put("code", entry.getKey());
            langMap.put("name", worldLanguages.getOrDefault(entry.getKey(), entry.getKey()));
            langMap.put("status", entry.getValue().name());
            languagesList.add(langMap);
        }
        statementData.put("availableLanguages", languagesList);

        // Grading
        Map<String, Object> gradingData = new HashMap<>();
        List<Map<String, Object>> testDataFilesList = new ArrayList<>();
        if (problem.getType() == ProblemType.PROGRAMMING) {
            String engine = programmingProblemStore.getGradingEngine(actor.getUserJid(), problem.getJid());
            GradingConfig config = programmingProblemStore.getGradingConfig(actor.getUserJid(), problem.getJid());
            LanguageRestriction restriction = programmingProblemStore.getLanguageRestriction(actor.getUserJid(), problem.getJid());

            GradingConfigAdapter adapter = GradingConfigAdapterRegistry.getInstance().get(engine);
            GradingConfigForm form = adapter.buildFormFromConfig(config);

            gradingData.put("engine", engine);
            gradingData.put("timeLimit", config.getTimeLimit());
            gradingData.put("memoryLimit", (int) Math.round(config.getMemoryLimit() / 1024.0));
            gradingData.put("isAllowedAll", restriction.isAllowedAll());
            gradingData.put("allowedLanguages", restriction.getAllowedLanguages());
            gradingData.put("availableEngines", new ArrayList<>(GradingEngineRegistry.getInstance().getNamesMap().keySet()));
            gradingData.put("engineNamesMap", GradingEngineRegistry.getInstance().getNamesMap());
            gradingData.put("availableLanguages", GradingLanguageRegistry.getInstance().getLanguages());

            gradingData.put("customScorer", form.getCustomScorer());
            gradingData.put("communicator", form.getCommunicator());

            List<Integer> nonNullSubtaskPoints = new ArrayList<>();
            if (form.getSubtaskPoints() != null) {
                for (Integer p : form.getSubtaskPoints()) {
                    if (p != null) {
                        nonNullSubtaskPoints.add(p);
                    }
                }
            }
            gradingData.put("subtaskPoints", nonNullSubtaskPoints);

            List<FileInfo> helperFiles = programmingProblemStore.getGradingHelperFiles(actor.getUserJid(), problem.getJid());
            List<Map<String, Object>> helperFilesList = new ArrayList<>();
            for (FileInfo fi : helperFiles) {
                Map<String, Object> hm = new HashMap<>();
                hm.put("name", fi.getName());
                hm.put("size", fi.getSize());
                helperFilesList.add(hm);
            }
            gradingData.put("helperFiles", helperFilesList);

            List<FileInfo> testDataFiles = programmingProblemStore.getGradingTestDataFiles(actor.getUserJid(), problem.getJid());
            for (FileInfo fi : testDataFiles) {
                Map<String, Object> fileMap = new HashMap<>();
                fileMap.put("name", fi.getName());
                fileMap.put("size", fi.getSize());
                testDataFilesList.add(fileMap);
            }
        }

        Map<String, Object> res = new HashMap<>();
        res.put("id", problem.getId());
        res.put("jid", problem.getJid());
        res.put("slug", problem.getSlug());
        res.put("type", problem.getType().name());
        res.put("additionalNote", problem.getAdditionalNote());
        res.put("authorUsername", authorProfile != null ? authorProfile.getUsername() : "-");
        res.put("updatedAt", problem.getLastUpdateTime() != null ? problem.getLastUpdateTime().toEpochMilli() : null);
        res.put("canEdit", canEdit);
        res.put("canSubmit", canSubmit);
        res.put("hasLocalChanges", hasLocalChanges);

        Map<String, String> settersMap = new HashMap<>();
        settersMap.put("writers", writerUsernames);
        settersMap.put("developers", developerUsernames);
        settersMap.put("testers", testerUsernames);
        settersMap.put("editorialists", editorialistUsernames);
        res.put("setters", settersMap);
        res.put("tags", tags);

        res.put("statement", statementData);
        res.put("grading", gradingData);
        res.put("testDataFiles", testDataFilesList);

        return Response.ok(res).build();
    }

    @DELETE
    @Path("/api/{problemId}")
    @Produces(APPLICATION_JSON)
    @UnitOfWork
    public Response deleteProblemJson(
            @Context HttpServletRequest req,
            @PathParam("problemId") String problemId) {

        Actor actor = actorChecker.check(req);
        Problem problem = checkFound(findProblem(problemId));
        checkAllowed(roleChecker.isAuthorOrAbove(actor, problem));

        String problemJid = problem.getJid();
        try {
            if (problemJid.startsWith("JIDPROG")) {
                if (trainingProgrammingGradingDao != null) {
                    trainingProgrammingGradingDao.deleteAllByProblemJid(problemJid);
                }
                if (trainingProgrammingSubmissionDao != null) {
                    trainingProgrammingSubmissionDao.deleteAllByProblemJid(problemJid);
                }
            } else {
                if (bundleItemSubmissionDao != null) {
                    bundleItemSubmissionDao.deleteAllByProblemJid(problemJid);
                }
            }
            if (statsUserProblemDao != null) {
                statsUserProblemDao.deleteAllByProblemJid(problemJid);
            }
            if (chapterProblemDao != null) {
                chapterProblemDao.selectByProblemJid(problemJid).ifPresent(chapterProblemDao::delete);
            }
            if (problemSetProblemDao != null) {
                problemSetProblemDao.selectAllByProblemJid(problemJid).forEach(problemSetProblemDao::delete);
            }
            if (contestProblemDao != null) {
                contestProblemDao.deleteAllByProblemJid(problemJid);
            }
            if (problemTagDao != null) {
                problemTagDao.selectAllByProblemJid(problemJid).forEach(problemTagDao::delete);
            }
        } catch (Exception ignored) {}

        problemStore.deleteProblem(problemJid);
        return Response.ok(Map.of("success", true, "message", "Problem deleted successfully.")).build();
    }

    @PUT
    @Path("/api/{problemId}/general")
    @Consumes(APPLICATION_JSON)
    @Produces(APPLICATION_JSON)
    @UnitOfWork
    public Response updateGeneralProblemJson(
            @Context HttpServletRequest req,
            @PathParam("problemId") String problemId,
            Map<String, Object> body) {

        Actor actor = actorChecker.check(req);
        Problem problem = checkFound(findProblem(problemId));
        checkAllowed(roleChecker.canEdit(actor, problem));

        String slug = (String) body.get("slug");
        String additionalNote = (String) body.getOrDefault("additionalNote", "");

        if (slug == null || slug.trim().isEmpty()) {
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity(Map.of("message", "Slug is required."))
                    .build();
        }

        if (!problem.getSlug().equals(slug) && problemStore.problemExistsBySlug(slug)) {
            return Response.status(Response.Status.CONFLICT)
                    .entity(Map.of("message", "Slug already exists."))
                    .build();
        }

        problemStore.updateProblem(problem.getJid(), slug, additionalNote);

        String writerUsernames = (String) body.getOrDefault("writers", "");
        String developerUsernames = (String) body.getOrDefault("developers", "");
        String testerUsernames = (String) body.getOrDefault("testers", "");
        String editorialistUsernames = (String) body.getOrDefault("editorialists", "");

        Set<String> usernames = new HashSet<>();
        if (writerUsernames != null && !writerUsernames.isEmpty()) usernames.addAll(Arrays.asList(writerUsernames.split(",")));
        if (developerUsernames != null && !developerUsernames.isEmpty()) usernames.addAll(Arrays.asList(developerUsernames.split(",")));
        if (testerUsernames != null && !testerUsernames.isEmpty()) usernames.addAll(Arrays.asList(testerUsernames.split(",")));
        if (editorialistUsernames != null && !editorialistUsernames.isEmpty()) usernames.addAll(Arrays.asList(editorialistUsernames.split(",")));
        usernames.remove("");
        Map<String, String> jidsMap = userStore.translateUsernamesToJids(usernames);

        Map<ProblemSetterRole, List<String>> setters = problemStore.getProblemSetters(problem.getJid());
        updateProblemSetters(problem.getJid(), ProblemSetterRole.WRITER, writerUsernames, setters, jidsMap);
        updateProblemSetters(problem.getJid(), ProblemSetterRole.DEVELOPER, developerUsernames, setters, jidsMap);
        updateProblemSetters(problem.getJid(), ProblemSetterRole.TESTER, testerUsernames, setters, jidsMap);
        updateProblemSetters(problem.getJid(), ProblemSetterRole.EDITORIALIST, editorialistUsernames, setters, jidsMap);

        if (body.containsKey("tags")) {
            List<String> tags = (List<String>) body.get("tags");
            tagStore.updateTopicTags(problem.getJid(), tags != null ? new HashSet<>(tags) : Set.of());
        }

        return Response.ok(Map.of("success", true, "message", "Problem general details updated successfully.")).build();
    }

    @GET
    @Path("/api/{problemId}/statement")
    @Produces(APPLICATION_JSON)
    @UnitOfWork(readOnly = true)
    public Response getStatementJson(
            @Context HttpServletRequest req,
            @PathParam("problemId") String problemId,
            @QueryParam("language") String language) {

        Actor actor = actorChecker.check(req);
        Problem problem = checkFound(findProblem(problemId));
        checkAllowed(roleChecker.canView(actor, problem));

        String lang = (language != null && !language.isEmpty())
                ? language
                : statementStore.getStatementDefaultLanguage(actor.getUserJid(), problem.getJid());

        ProblemStatement statement;
        try {
            statement = statementStore.getStatement(actor.getUserJid(), problem.getJid(), lang);
        } catch (Exception e) {
            statement = new ProblemStatement.Builder().title("").text("").build();
        }

        return Response.ok(Map.of(
                "language", lang != null ? lang : "en-US",
                "title", statement != null ? statement.getTitle() : "",
                "text", statement != null ? statement.getText() : ""
        )).build();
    }

    @PUT
    @Path("/api/{problemId}/statement")
    @Consumes(APPLICATION_JSON)
    @Produces(APPLICATION_JSON)
    @UnitOfWork
    public Response updateStatementJson(
            @Context HttpServletRequest req,
            @PathParam("problemId") String problemId,
            Map<String, String> body) {

        Actor actor = actorChecker.check(req);
        Problem problem = checkFound(findProblem(problemId));
        checkAllowed(roleChecker.canEdit(actor, problem));

        String language = body.get("language");
        String title = body.getOrDefault("title", "");
        String text = body.getOrDefault("text", "");

        if (language == null || language.trim().isEmpty()) {
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity(Map.of("message", "Language is required."))
                    .build();
        }

        problemStore.createUserCloneIfNotExists(actor.getUserJid(), problem.getJid());
        statementStore.updateStatement(actor.getUserJid(), problem.getJid(), language, new ProblemStatement.Builder()
                .title(title)
                .text(text)
                .build());

        return Response.ok(Map.of("success", true, "message", "Statement updated successfully.")).build();
    }

    @POST
    @Path("/api/{problemId}/statement/languages")
    @Consumes(APPLICATION_JSON)
    @Produces(APPLICATION_JSON)
    @UnitOfWork
    public Response addStatementLanguageJson(
            @Context HttpServletRequest req,
            @PathParam("problemId") String problemId,
            Map<String, String> body) {

        Actor actor = actorChecker.check(req);
        Problem problem = checkFound(findProblem(problemId));
        checkAllowed(roleChecker.canEdit(actor, problem));

        String language = body.get("language");
        if (language == null || !WorldLanguageRegistry.getInstance().getLanguages().containsKey(language)) {
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity(Map.of("message", "Invalid or missing language code."))
                    .build();
        }

        problemStore.createUserCloneIfNotExists(actor.getUserJid(), problem.getJid());
        statementStore.addStatementLanguage(actor.getUserJid(), problem.getJid(), language);

        return Response.ok(Map.of("success", true, "message", "Language added successfully.")).build();
    }

    @GET
    @Path("/api/{problemId}/statement/media")
    @Produces(APPLICATION_JSON)
    @UnitOfWork(readOnly = true)
    public Response listStatementMediaFilesJson(
            @Context HttpServletRequest req,
            @PathParam("problemId") String problemId) {

        Actor actor = actorChecker.check(req);
        Problem problem = checkFound(findProblem(problemId));
        checkAllowed(roleChecker.canView(actor, problem));

        List<FileInfo> mediaFiles = statementStore.getStatementMediaFiles(actor.getUserJid(), problem.getJid());
        List<Map<String, Object>> result = mediaFiles.stream().map(fi -> {
            Map<String, Object> m = new HashMap<>();
            m.put("name", fi.getName());
            m.put("size", fi.getSize());
            m.put("url", "/problems/api/" + problem.getId() + "/statement/render/" + fi.getName());
            return m;
        }).collect(Collectors.toList());

        return Response.ok(Map.of("files", result)).build();
    }

    @POST
    @Path("/api/{problemId}/statement/media")
    @Consumes(MULTIPART_FORM_DATA)
    @Produces(APPLICATION_JSON)
    @UnitOfWork
    public Response uploadStatementMediaJson(
            @Context HttpServletRequest req,
            @PathParam("problemId") String problemId,
            @FormDataParam("file") InputStream fileStream,
            @FormDataParam("file") FormDataContentDisposition fileDetails) {

        Actor actor = actorChecker.check(req);
        Problem problem = checkFound(findProblem(problemId));
        checkAllowed(roleChecker.canEdit(actor, problem));

        if (fileStream == null || fileDetails == null || fileDetails.getFileName() == null) {
            return Response.status(Response.Status.BAD_REQUEST).entity(Map.of("message", "No file provided")).build();
        }

        problemStore.createUserCloneIfNotExists(actor.getUserJid(), problem.getJid());
        statementStore.uploadStatementMediaFile(actor.getUserJid(), problem.getJid(), fileStream, fileDetails.getFileName());

        return Response.ok(Map.of(
                "success", true,
                "filename", fileDetails.getFileName(),
                "url", "/problems/api/" + problem.getId() + "/statement/render/" + fileDetails.getFileName()
        )).build();
    }

    @GET
    @Path("/api/{problemId}/statement/render/{filename}")
    @UnitOfWork(readOnly = true)
    public Response renderStatementMediaFileJson(
            @Context HttpServletRequest req,
            @PathParam("problemId") String problemId,
            @PathParam("filename") String filename) {

        Actor actor = actorChecker.check(req);
        Problem problem = checkFound(findProblem(problemId));
        checkAllowed(roleChecker.canView(actor, problem));

        String mediaUrl = statementStore.getStatementMediaFileURL(actor.getUserJid(), problem.getJid(), filename);
        return ServiceUtils.buildMediaResponse(mediaUrl, Optional.empty());
    }

    @PUT
    @Path("/api/{problemId}/grading")
    @Consumes(APPLICATION_JSON)
    @Produces(APPLICATION_JSON)
    @UnitOfWork
    public Response updateGradingConfigJson(
            @Context HttpServletRequest req,
            @PathParam("problemId") String problemId,
            Map<String, Object> body) {

        Actor actor = actorChecker.check(req);
        Problem problem = checkFound(findProblem(problemId));
        checkAllowed(roleChecker.canEdit(actor, problem));

        if (problem.getType() != ProblemType.PROGRAMMING) {
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity(Map.of("message", "Grading config only supported for programming problems."))
                    .build();
        }

        problemStore.createUserCloneIfNotExists(actor.getUserJid(), problem.getJid());

        String newEngine = (String) body.get("engine");
        String currentEngine = programmingProblemStore.getGradingEngine(actor.getUserJid(), problem.getJid());

        if (newEngine != null && !newEngine.isEmpty() && !newEngine.equals(currentEngine)) {
            GradingConfig defaultConfig = GradingEngineRegistry.getInstance().get(newEngine).createDefaultConfig();
            programmingProblemStore.updateGradingConfig(actor.getUserJid(), problem.getJid(), defaultConfig);
            programmingProblemStore.updateGradingEngine(actor.getUserJid(), problem.getJid(), newEngine);
            currentEngine = newEngine;
        }

        GradingConfig currentConfig = programmingProblemStore.getGradingConfig(actor.getUserJid(), problem.getJid());
        GradingConfigAdapter adapter = GradingConfigAdapterRegistry.getInstance().get(currentEngine);
        GradingConfigForm form = adapter.buildFormFromConfig(currentConfig);

        if (body.containsKey("timeLimit")) {
            Number tl = (Number) body.get("timeLimit");
            form.timeLimit = tl.intValue();
        }
        if (body.containsKey("memoryLimit")) {
            Number ml = (Number) body.get("memoryLimit");
            int val = ml.intValue();
            form.memoryLimit = (val <= 4096) ? val * 1024 : val;
        }
        if (body.containsKey("customScorer")) {
            String cs = (String) body.get("customScorer");
            form.customScorer = (cs == null || cs.isEmpty()) ? GradingConfigForm.HELPER_NONE : cs;
        }
        if (body.containsKey("communicator")) {
            String comm = (String) body.get("communicator");
            form.communicator = (comm == null || comm.isEmpty()) ? GradingConfigForm.HELPER_NONE : comm;
        }
        if (body.containsKey("subtaskPoints")) {
            List<?> rawPoints = (List<?>) body.get("subtaskPoints");
            List<Integer> subtaskPoints = new ArrayList<>();
            if (rawPoints != null) {
                for (Object item : rawPoints) {
                    if (item instanceof Number) {
                        subtaskPoints.add(((Number) item).intValue());
                    } else if (item != null) {
                        try {
                            subtaskPoints.add(Integer.parseInt(item.toString()));
                        } catch (NumberFormatException ignored) {}
                    }
                }
            }
            form.subtaskPoints = subtaskPoints;
        }

        GradingConfig newConfig = adapter.buildConfigFromForm(form);
        programmingProblemStore.updateGradingConfig(actor.getUserJid(), problem.getJid(), newConfig);

        if (body.containsKey("isAllowedAll")) {
            boolean isAllowedAll = Boolean.TRUE.equals(body.get("isAllowedAll"));
            List<String> allowedLangs = (List<String>) body.get("allowedLanguages");
            LanguageRestriction restriction = LanguageRestrictionAdapter.getLanguageRestriction(
                    isAllowedAll, allowedLangs != null ? new HashSet<>(allowedLangs) : Set.of());
            programmingProblemStore.updateLanguageRestriction(actor.getUserJid(), problem.getJid(), restriction);
        }

        return Response.ok(Map.of("success", true, "message", "Grading configuration updated.")).build();
    }

    @GET
    @Path("/api/{problemId}/testdata")
    @Produces(APPLICATION_JSON)
    @UnitOfWork(readOnly = true)
    public Response listTestDataFilesJson(
            @Context HttpServletRequest req,
            @PathParam("problemId") String problemId) {

        Actor actor = actorChecker.check(req);
        Problem problem = checkFound(findProblem(problemId));
        checkAllowed(roleChecker.canView(actor, problem));

        List<FileInfo> files = programmingProblemStore.getGradingTestDataFiles(actor.getUserJid(), problem.getJid());
        List<Map<String, Object>> result = files.stream().map(fi -> {
            Map<String, Object> m = new HashMap<>();
            m.put("name", fi.getName());
            m.put("size", fi.getSize());
            return m;
        }).collect(Collectors.toList());

        return Response.ok(Map.of("files", result)).build();
    }

    @POST
    @Path("/api/{problemId}/testdata/upload")
    @Consumes(MULTIPART_FORM_DATA)
    @Produces(APPLICATION_JSON)
    @UnitOfWork
    public Response uploadTestDataJson(
            @Context HttpServletRequest req,
            @PathParam("problemId") String problemId,
            @FormDataParam("file") InputStream fileStream,
            @FormDataParam("file") FormDataContentDisposition fileDetails,
            @FormDataParam("fileZipped") InputStream fileZippedStream) {

        Actor actor = actorChecker.check(req);
        Problem problem = checkFound(findProblem(problemId));
        checkAllowed(roleChecker.canEdit(actor, problem));

        problemStore.createUserCloneIfNotExists(actor.getUserJid(), problem.getJid());

        if (fileStream != null && fileDetails != null && fileDetails.getFileName() != null) {
            String fileName = fileDetails.getFileName();
            if (fileName.toLowerCase().endsWith(".zip")) {
                programmingProblemStore.uploadGradingTestDataFileZipped(actor.getUserJid(), problem.getJid(), fileStream);
            } else {
                programmingProblemStore.uploadGradingTestDataFile(actor.getUserJid(), problem.getJid(), fileStream, fileName);
            }
        } else if (fileZippedStream != null) {
            programmingProblemStore.uploadGradingTestDataFileZipped(actor.getUserJid(), problem.getJid(), fileZippedStream);
        } else {
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity(Map.of("message", "No file provided."))
                    .build();
        }

        return Response.ok(Map.of("success", true, "message", "File uploaded successfully.")).build();
    }

    @DELETE
    @Path("/api/{problemId}/testdata/{filename}")
    @Produces(APPLICATION_JSON)
    @UnitOfWork
    public Response deleteTestDataJson(
            @Context HttpServletRequest req,
            @PathParam("problemId") String problemId,
            @PathParam("filename") String filename) {

        Actor actor = actorChecker.check(req);
        Problem problem = checkFound(findProblem(problemId));
        checkAllowed(roleChecker.canEdit(actor, problem));

        problemStore.createUserCloneIfNotExists(actor.getUserJid(), problem.getJid());
        programmingProblemStore.deleteGradingTestDataFile(actor.getUserJid(), problem.getJid(), filename);

        return Response.ok(Map.of("success", true, "message", "File deleted.")).build();
    }

    @POST
    @Path("/api/{problemId}/testdata/auto-populate")
    @Produces(APPLICATION_JSON)
    @UnitOfWork
    public Response autoPopulateTestDataJson(
            @Context HttpServletRequest req,
            @PathParam("problemId") String problemId) {

        Actor actor = actorChecker.check(req);
        Problem problem = checkFound(findProblem(problemId));
        checkAllowed(roleChecker.canEdit(actor, problem));

        String engine = programmingProblemStore.getGradingEngine(actor.getUserJid(), problem.getJid());
        GradingConfig config = programmingProblemStore.getGradingConfig(actor.getUserJid(), problem.getJid());
        List<FileInfo> testDataFiles = programmingProblemStore.getGradingTestDataFiles(actor.getUserJid(), problem.getJid());

        problemStore.createUserCloneIfNotExists(actor.getUserJid(), problem.getJid());

        GradingConfigAdapter adapter = GradingConfigAdapterRegistry.getInstance().get(engine);
        GradingConfig newConfig = adapter.autoPopulateTestData(config, testDataFiles);

        programmingProblemStore.updateGradingConfig(actor.getUserJid(), problem.getJid(), newConfig);

        return Response.ok(Map.of(
                "success", true,
                "message", "Test data auto-populated from files successfully.",
                "testGroupsCount", newConfig.getTestData().size()
        )).build();
    }

    @GET
    @Path("/api/{problemId}/testdata/download/{filename}")
    @UnitOfWork(readOnly = true)
    public Response downloadTestDataFileJson(
            @Context HttpServletRequest req,
            @PathParam("problemId") String problemId,
            @PathParam("filename") String filename) {

        Actor actor = actorChecker.check(req);
        Problem problem = checkFound(findProblem(problemId));
        checkAllowed(roleChecker.canView(actor, problem));

        String url = programmingProblemStore.getGradingTestDataFileURL(actor.getUserJid(), problem.getJid(), filename);
        return ServiceUtils.buildDownloadResponse(url);
    }

    @GET
    @Path("/api/{problemId}/submissions")
    @Produces(APPLICATION_JSON)
    @UnitOfWork(readOnly = true)
    public Response getSubmissionsJson(
            @Context HttpServletRequest req,
            @PathParam("problemId") String problemId,
            @QueryParam("page") @DefaultValue("1") int pageNumber) {

        Actor actor = actorChecker.check(req);
        Problem problem = checkFound(findProblem(problemId));
        checkAllowed(roleChecker.canView(actor, problem));

        Page<Submission> submissions = submissionStore.getSubmissions(
                Optional.empty(), Optional.empty(), Optional.of(problem.getJid()), pageNumber, 20);

        var userJids = Lists.transform(submissions.getPage(), Submission::getUserJid);
        Map<String, Profile> profilesMap = profileStore.getProfiles(userJids);

        List<Map<String, Object>> list = new ArrayList<>();
        for (Submission s : submissions.getPage()) {
            Map<String, Object> map = new HashMap<>();
            map.put("id", s.getId());
            map.put("jid", s.getJid());
            map.put("userJid", s.getUserJid());
            map.put("authorUsername", profilesMap.containsKey(s.getUserJid()) ? profilesMap.get(s.getUserJid()).getUsername() : "-");
            map.put("gradingLanguage", s.getGradingLanguage());
            map.put("gradingEngine", s.getGradingEngine());
            map.put("submittedAt", s.getTime().toEpochMilli());

            Optional<Grading> grading = s.getLatestGrading();
            map.put("verdict", grading.map(g -> g.getVerdict().name()).orElse("PENDING"));
            map.put("score", grading.map(Grading::getScore).orElse(0));
            list.add(map);
        }

        Map<String, Object> res = new HashMap<>();
        res.put("submissions", list);
        res.put("totalCount", submissions.getTotalCount());
        res.put("pageNumber", submissions.getPageNumber());
        res.put("pageSize", submissions.getPageSize());

        return Response.ok(res).build();
    }

    @POST
    @Path("/api/{problemId}/submissions")
    @Consumes(APPLICATION_JSON)
    @Produces(APPLICATION_JSON)
    @UnitOfWork
    public Response createSubmissionJson(
            @Context HttpServletRequest req,
            @PathParam("problemId") String problemId,
            Map<String, String> body) {

        Actor actor = actorChecker.check(req);
        Problem problem = checkFound(findProblem(problemId));
        checkAllowed(roleChecker.canSubmit(actor, problem));

        String gradingLanguage = body.get("gradingLanguage");
        String sourceCode = body.get("sourceCode");

        if (gradingLanguage == null || gradingLanguage.isEmpty() || sourceCode == null) {
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity(Map.of("message", "gradingLanguage and sourceCode are required."))
                    .build();
        }

        String userJidForGrading = problemStore.userCloneExists(actor.getUserJid(), problem.getJid()) ? actor.getUserJid() : null;
        String gradingEngine = programmingProblemStore.getGradingEngine(userJidForGrading, problem.getJid());
        Instant gradingLastUpdateTime = programmingProblemStore.getGradingLastUpdateTime(userJidForGrading, problem.getJid());
        GradingConfig gradingConfig = programmingProblemStore.getGradingConfig(userJidForGrading, problem.getJid());
        LanguageRestriction gradingLanguageRestriction = programmingProblemStore.getLanguageRestriction(userJidForGrading, problem.getJid());

        String sourceKey = "source";
        if (gradingConfig.getSourceFileFields() != null && !gradingConfig.getSourceFileFields().isEmpty()) {
            sourceKey = gradingConfig.getSourceFileFields().keySet().iterator().next();
        }

        String filename = sourceKey;
        try {
            var lang = GradingLanguageRegistry.getInstance().get(gradingLanguage);
            if (lang != null && !lang.getAllowedExtensions().isEmpty()) {
                String ext = lang.getAllowedExtensions().get(0);
                if ("Java".equalsIgnoreCase(gradingLanguage)) {
                    filename = "Solution.java";
                } else if (!sourceKey.contains(".")) {
                    filename = sourceKey + "." + ext;
                }
            }
        } catch (Exception ignored) {
            filename = sourceKey + ".cpp";
        }

        SubmissionSource source = new SubmissionSource.Builder()
                .putSubmissionFiles(sourceKey, new SourceFile.Builder()
                        .name(filename)
                        .content(sourceCode.getBytes(StandardCharsets.UTF_8))
                        .build())
                .build();

        SubmissionData data = new SubmissionData.Builder()
                .problemJid(problem.getJid())
                .containerJid(problem.getJid())
                .gradingLanguage(gradingLanguage)
                .build();

        ProblemSubmissionConfig config = new ProblemSubmissionConfig.Builder()
                .sourceKeys(gradingConfig.getSourceFileFields())
                .gradingEngine(gradingEngine)
                .gradingLanguageRestriction(gradingLanguageRestriction)
                .gradingLastUpdateTime(gradingLastUpdateTime)
                .build();

        GradingOptions options = new GradingOptions.Builder().shouldRevealEvaluation(true).build();
        Submission submission = submissionClient.submit(data, source, config, options);
        submissionSourceBuilder.storeSubmissionSource(submission.getJid(), source);

        return Response.ok(Map.of(
                "id", submission.getId(),
                "jid", submission.getJid(),
                "verdict", "PENDING"
        )).build();
    }

    @GET
    @Path("/api/{problemId}/submissions/{submissionId}")
    @Produces(APPLICATION_JSON)
    @UnitOfWork(readOnly = true)
    public Response getSubmissionDetailJson(
            @Context HttpServletRequest req,
            @PathParam("problemId") String problemId,
            @PathParam("submissionId") long submissionId) {

        Actor actor = actorChecker.check(req);
        Problem problem = checkFound(findProblem(problemId));
        checkAllowed(roleChecker.canView(actor, problem));

        Submission submission = checkFound(submissionStore.getSubmissionById(submissionId));
        Profile profile = profileStore.getProfile(submission.getUserJid());

        String sourceCode = "";
        try {
            sourceCode = submissionSourceBuilder.fromPastSubmission(submission.getJid()).asString();
        } catch (Exception ignored) {}

        Map<String, Object> map = new HashMap<>();
        map.put("id", submission.getId());
        map.put("jid", submission.getJid());
        map.put("authorUsername", profile != null ? profile.getUsername() : "-");
        map.put("gradingLanguage", submission.getGradingLanguage());
        map.put("gradingEngine", submission.getGradingEngine());
        map.put("submittedAt", submission.getTime().toEpochMilli());
        map.put("sourceCode", sourceCode);

        Optional<Grading> grading = submission.getLatestGrading();
        map.put("verdict", grading.map(g -> g.getVerdict().name()).orElse("PENDING"));
        map.put("score", grading.map(Grading::getScore).orElse(0));

        if (grading.isPresent() && grading.get().getDetails().isPresent()) {
            var details = grading.get().getDetails().get();
            map.put("compilationOutputs", details.getCompilationOutputs());
            map.put("errorMessage", details.getErrorMessage().orElse(null));
        }

        return Response.ok(map).build();
    }

    @POST
    @Path("/api/{problemId}/versions/commit")
    @Consumes(APPLICATION_JSON)
    @Produces(APPLICATION_JSON)
    @UnitOfWork
    public Response commitLocalChangesJson(
            @Context HttpServletRequest req,
            @PathParam("problemId") String problemId,
            Map<String, String> body) {

        Actor actor = actorChecker.check(req);
        Problem problem = checkFound(findProblem(problemId));
        checkAllowed(roleChecker.canEdit(actor, problem));

        String title = (body != null && body.containsKey("message") && !body.get("message").isBlank())
                ? body.get("message")
                : "Update problem";

        if (!problemStore.userCloneExists(actor.getUserJid(), problem.getJid())) {
            return Response.ok(Map.of("success", true, "message", "No local changes to publish.")).build();
        }

        if (versionStore.fetchUserClone(actor.getUserJid(), problem.getJid())) {
            return Response.status(Response.Status.CONFLICT)
                    .entity(Map.of("message", "There have been newer changes in the master copy. Please rebase."))
                    .build();
        } else if (!versionStore.commitThenMergeUserClone(actor.getUserJid(), problem.getJid(), title, "")) {
            return Response.status(Response.Status.CONFLICT)
                    .entity(Map.of("message", "Your local changes conflict with the master copy."))
                    .build();
        } else if (!versionStore.pushUserClone(actor.getUserJid(), problem.getJid())) {
            return Response.status(Response.Status.CONFLICT)
                    .entity(Map.of("message", "Failed to push local changes to master copy."))
                    .build();
        }

        versionStore.discardUserClone(actor.getUserJid(), problem.getJid());
        tagStore.refreshDerivedTags(problem.getJid());

        return Response.ok(Map.of("success", true, "message", "Changes published successfully to production!")).build();
    }

    @POST
    @Path("/api/{problemId}/versions/discard")
    @Produces(APPLICATION_JSON)
    @UnitOfWork
    public Response discardLocalChangesJson(
            @Context HttpServletRequest req,
            @PathParam("problemId") String problemId) {

        Actor actor = actorChecker.check(req);
        Problem problem = checkFound(findProblem(problemId));
        checkAllowed(roleChecker.canEdit(actor, problem));

        if (problemStore.userCloneExists(actor.getUserJid(), problem.getJid())) {
            versionStore.discardUserClone(actor.getUserJid(), problem.getJid());
        }

        return Response.ok(Map.of("success", true, "message", "Local changes discarded.")).build();
    }

    @GET
    @Path("/api/{problemId}/bundle/items")
    @Produces(APPLICATION_JSON)
    @UnitOfWork(readOnly = true)
    public Response getBundleItemsJson(
            @Context HttpServletRequest req,
            @PathParam("problemId") String problemId) {

        Actor actor = actorChecker.check(req);
        Problem problem = checkFound(findProblem(problemId));
        checkAllowed(roleChecker.canView(actor, problem));

        String userJid = problemStore.userCloneExists(actor.getUserJid(), problem.getJid()) ? actor.getUserJid() : null;
        String defaultLanguage = statementStore.getStatementDefaultLanguage(userJid, problem.getJid());
        List<BundleItem> items = bundleItemStore.getNumberedItems(userJid, problem.getJid());

        List<Map<String, Object>> result = new ArrayList<>();
        for (BundleItem item : items) {
            Map<String, Object> itemMap = new HashMap<>();
            itemMap.put("jid", item.getJid());
            itemMap.put("type", item.getType().name());
            item.getNumber().ifPresent(n -> itemMap.put("number", n));

            ItemConfig cfg = bundleItemStore.getItemConfig(userJid, problem.getJid(), item, defaultLanguage, defaultLanguage);
            Map<String, Object> configMap = new HashMap<>();
            if (cfg != null) {
                configMap.put("statement", cfg.getStatement());

                if (item.getType() == ItemType.MULTIPLE_CHOICE && cfg instanceof MultipleChoiceItemConfig) {
                    MultipleChoiceItemConfig mc = (MultipleChoiceItemConfig) cfg;
                    configMap.put("score", mc.getScore());
                    configMap.put("penalty", mc.getPenalty());
                    List<Map<String, Object>> choices = new ArrayList<>();
                    for (var ch : mc.getChoices()) {
                        Map<String, Object> choiceMap = new HashMap<>();
                        choiceMap.put("alias", ch.getAlias());
                        choiceMap.put("content", ch.getContent());
                        choiceMap.put("isCorrect", ch.getIsCorrect().orElse(false));
                        choices.add(choiceMap);
                    }
                    configMap.put("choices", choices);
                } else if (item.getType() == ItemType.SHORT_ANSWER && cfg instanceof ShortAnswerItemConfig) {
                    ShortAnswerItemConfig sa = (ShortAnswerItemConfig) cfg;
                    configMap.put("score", sa.getScore());
                    configMap.put("penalty", sa.getPenalty());
                    configMap.put("inputValidationRegex", sa.getInputValidationRegex());
                    configMap.put("gradingRegex", sa.getGradingRegex().orElse(""));
                }
            }

            itemMap.put("config", configMap);
            result.add(itemMap);
        }

        return Response.ok(result).build();
    }

    @POST
    @Path("/api/{problemId}/bundle/items")
    @Consumes(APPLICATION_JSON)
    @Produces(APPLICATION_JSON)
    @UnitOfWork
    public Response createBundleItemJson(
            @Context HttpServletRequest req,
            @PathParam("problemId") String problemId,
            Map<String, Object> body) {

        Actor actor = actorChecker.check(req);
        Problem problem = checkFound(findProblem(problemId));
        checkAllowed(roleChecker.canEdit(actor, problem));

        problemStore.createUserCloneIfNotExists(actor.getUserJid(), problem.getJid());
        String defaultLanguage = statementStore.getStatementDefaultLanguage(actor.getUserJid(), problem.getJid());

        String typeStr = (String) body.getOrDefault("type", "MULTIPLE_CHOICE");
        ItemType type = ItemType.valueOf(typeStr);

        ItemConfig config;
        if (type == ItemType.MULTIPLE_CHOICE) {
            List<Map<String, Object>> choicesRaw = (List<Map<String, Object>>) body.get("choices");
            List<MultipleChoiceItemConfig.Choice> choices = new ArrayList<>();
            if (choicesRaw != null) {
                for (Map<String, Object> c : choicesRaw) {
                    choices.add(new MultipleChoiceItemConfig.Choice.Builder()
                            .alias((String) c.getOrDefault("alias", ""))
                            .content((String) c.getOrDefault("content", ""))
                            .isCorrect(Boolean.TRUE.equals(c.get("isCorrect")))
                            .build());
                }
            } else {
                choices = List.of(
                        new MultipleChoiceItemConfig.Choice.Builder().alias("a").content("").isCorrect(true).build(),
                        new MultipleChoiceItemConfig.Choice.Builder().alias("b").content("").isCorrect(false).build(),
                        new MultipleChoiceItemConfig.Choice.Builder().alias("c").content("").isCorrect(false).build(),
                        new MultipleChoiceItemConfig.Choice.Builder().alias("d").content("").isCorrect(false).build()
                );
            }
            double score = body.containsKey("score") ? Double.parseDouble(String.valueOf(body.get("score"))) : 4.0;
            double penalty = body.containsKey("penalty") ? Double.parseDouble(String.valueOf(body.get("penalty"))) : 0.0;
            config = new MultipleChoiceItemConfig.Builder()
                    .statement((String) body.getOrDefault("statement", ""))
                    .score(score)
                    .penalty(penalty)
                    .choices(choices)
                    .build();
        } else {
            double score = body.containsKey("score") ? Double.parseDouble(String.valueOf(body.get("score"))) : 10.0;
            double penalty = body.containsKey("penalty") ? Double.parseDouble(String.valueOf(body.get("penalty"))) : 0.0;
            String gradingRegex = (String) body.getOrDefault("gradingRegex", "");
            config = new ShortAnswerItemConfig.Builder()
                    .statement((String) body.getOrDefault("statement", ""))
                    .score(score)
                    .penalty(penalty)
                    .inputValidationRegex((String) body.getOrDefault("inputValidationRegex", ".*"))
                    .gradingRegex(Optional.ofNullable(gradingRegex.isEmpty() ? null : gradingRegex))
                    .build();
        }

        BundleItem item = bundleItemStore.createItem(actor.getUserJid(), problem.getJid(), type, config, defaultLanguage);
        return Response.ok(Map.of("success", true, "jid", item.getJid())).build();
    }

    @PUT
    @Path("/api/{problemId}/bundle/items/{itemJid}")
    @Consumes(APPLICATION_JSON)
    @Produces(APPLICATION_JSON)
    @UnitOfWork
    public Response updateBundleItemJson(
            @Context HttpServletRequest req,
            @PathParam("problemId") String problemId,
            @PathParam("itemJid") String itemJid,
            Map<String, Object> body) {

        Actor actor = actorChecker.check(req);
        Problem problem = checkFound(findProblem(problemId));
        checkAllowed(roleChecker.canEdit(actor, problem));

        problemStore.createUserCloneIfNotExists(actor.getUserJid(), problem.getJid());
        String defaultLanguage = statementStore.getStatementDefaultLanguage(actor.getUserJid(), problem.getJid());

        BundleItem item = checkFound(bundleItemStore.getNumberedItem(actor.getUserJid(), problem.getJid(), itemJid));
        ItemType type = item.getType();

        ItemConfig config;
        if (type == ItemType.MULTIPLE_CHOICE) {
            List<Map<String, Object>> choicesRaw = (List<Map<String, Object>>) body.get("choices");
            List<MultipleChoiceItemConfig.Choice> choices = new ArrayList<>();
            if (choicesRaw != null) {
                for (Map<String, Object> c : choicesRaw) {
                    choices.add(new MultipleChoiceItemConfig.Choice.Builder()
                            .alias((String) c.getOrDefault("alias", ""))
                            .content((String) c.getOrDefault("content", ""))
                            .isCorrect(Boolean.TRUE.equals(c.get("isCorrect")))
                            .build());
                }
            }
            double score = body.containsKey("score") ? Double.parseDouble(String.valueOf(body.get("score"))) : 4.0;
            double penalty = body.containsKey("penalty") ? Double.parseDouble(String.valueOf(body.get("penalty"))) : 0.0;
            config = new MultipleChoiceItemConfig.Builder()
                    .statement((String) body.getOrDefault("statement", ""))
                    .score(score)
                    .penalty(penalty)
                    .choices(choices)
                    .build();
        } else {
            double score = body.containsKey("score") ? Double.parseDouble(String.valueOf(body.get("score"))) : 10.0;
            double penalty = body.containsKey("penalty") ? Double.parseDouble(String.valueOf(body.get("penalty"))) : 0.0;
            String gradingRegex = (String) body.getOrDefault("gradingRegex", "");
            config = new ShortAnswerItemConfig.Builder()
                    .statement((String) body.getOrDefault("statement", ""))
                    .score(score)
                    .penalty(penalty)
                    .inputValidationRegex((String) body.getOrDefault("inputValidationRegex", ".*"))
                    .gradingRegex(Optional.ofNullable(gradingRegex.isEmpty() ? null : gradingRegex))
                    .build();
        }

        bundleItemStore.updateItem(actor.getUserJid(), problem.getJid(), item, item.getMeta(), config, defaultLanguage);
        return Response.ok(Map.of("success", true)).build();
    }

    @DELETE
    @Path("/api/{problemId}/bundle/items/{itemJid}")
    @Produces(APPLICATION_JSON)
    @UnitOfWork
    public Response deleteBundleItemJson(
            @Context HttpServletRequest req,
            @PathParam("problemId") String problemId,
            @PathParam("itemJid") String itemJid) {

        Actor actor = actorChecker.check(req);
        Problem problem = checkFound(findProblem(problemId));
        checkAllowed(roleChecker.canEdit(actor, problem));

        problemStore.createUserCloneIfNotExists(actor.getUserJid(), problem.getJid());
        bundleItemStore.removeItem(actor.getUserJid(), problem.getJid(), itemJid);
        return Response.ok(Map.of("success", true)).build();
    }

    @POST
    @Path("/api/{problemId}/bundle/items/{itemJid}/move-up")
    @Produces(APPLICATION_JSON)
    @UnitOfWork
    public Response moveBundleItemUpJson(
            @Context HttpServletRequest req,
            @PathParam("problemId") String problemId,
            @PathParam("itemJid") String itemJid) {

        Actor actor = actorChecker.check(req);
        Problem problem = checkFound(findProblem(problemId));
        checkAllowed(roleChecker.canEdit(actor, problem));

        problemStore.createUserCloneIfNotExists(actor.getUserJid(), problem.getJid());
        bundleItemStore.moveItemUp(actor.getUserJid(), problem.getJid(), itemJid);
        return Response.ok(Map.of("success", true)).build();
    }

    @POST
    @Path("/api/{problemId}/bundle/items/{itemJid}/move-down")
    @Produces(APPLICATION_JSON)
    @UnitOfWork
    public Response moveBundleItemDownJson(
            @Context HttpServletRequest req,
            @PathParam("problemId") String problemId,
            @PathParam("itemJid") String itemJid) {

        Actor actor = actorChecker.check(req);
        Problem problem = checkFound(findProblem(problemId));
        checkAllowed(roleChecker.canEdit(actor, problem));

        problemStore.createUserCloneIfNotExists(actor.getUserJid(), problem.getJid());
        bundleItemStore.moveItemDown(actor.getUserJid(), problem.getJid(), itemJid);
        return Response.ok(Map.of("success", true)).build();
    }

    @GET
    @Path("/new")
    @UnitOfWork(readOnly = true)
    public View newProblem(@Context HttpServletRequest req) {
        Actor actor = actorChecker.check(req);
        checkAllowed(roleChecker.isWriter(actor));

        NewProblemForm form = new NewProblemForm();
        form.gradingEngine = "Batch";
        form.initialLanguage = "en-US";

        return renderNewProblem(actor, form);
    }

    private View renderNewProblem(Actor actor, NewProblemForm form) {
        HtmlTemplate template = newProblemsTemplate(actor);
        template.setTitle("New problem");
        return new NewProblemView(template, form);
    }

    @POST
    @Path("/new")
    @UnitOfWork
    public Response createProblem(@Context HttpServletRequest req, @BeanParam NewProblemForm form) {
        Actor actor = actorChecker.check(req);
        checkAllowed(roleChecker.isWriter(actor));

        if (problemStore.problemExistsBySlug(form.slug)) {
            form.globalError = "Slug already exists.";
            return ok(renderNewProblem(actor, form));
        }

        ProblemType type = form.gradingEngine.equals("Bundle") ? ProblemType.BUNDLE : ProblemType.PROGRAMMING;
        Problem problem = problemStore.createProblem(type, form.slug, form.additionalNote);

        statementStore.initStatements(problem.getJid(), type, form.initialLanguage);

        if (type == ProblemType.BUNDLE) {
            bundleProblemStore.initBundleProblem(problem.getJid());
        } else {
            programmingProblemStore.initProgrammingProblem(problem.getJid(), form.gradingEngine);
            tagStore.refreshDerivedTags(problem.getJid());
        }

        problemStore.initRepository(actor.getUserJid(), problem.getJid());

        setCurrentStatementLanguage(req, form.initialLanguage);
        return redirect("/problems/" + problem.getType().name().toLowerCase() + "/" + problem.getId() + "/statements");
    }

    @GET
    @Path("/{problemId}")
    @UnitOfWork(readOnly = true)
    public View viewProblem(@Context HttpServletRequest req, @PathParam("problemId") int problemId) {
        Actor actor = actorChecker.check(req);
        Problem problem = checkFound(problemStore.getProblemById(problemId));
        checkAllowed(roleChecker.canView(actor, problem));

        Profile profile = profileStore.getProfile(problem.getAuthorJid());

        Map<ProblemSetterRole, List<String>> setters = problemStore.getProblemSetters(problem.getJid());
        Map<String, Profile> profilesMap = profileStore.getProfiles(setters.values()
                .stream()
                .flatMap(List::stream)
                .collect(Collectors.toSet()));

        String writerUsernames = userJidsToUsernames(setters.get(ProblemSetterRole.WRITER), profilesMap);
        String developerUsernames = userJidsToUsernames(setters.get(ProblemSetterRole.DEVELOPER), profilesMap);
        String testerUsernames = userJidsToUsernames(setters.get(ProblemSetterRole.TESTER), profilesMap);
        String editorialistUsernames = userJidsToUsernames(setters.get(ProblemSetterRole.EDITORIALIST), profilesMap);

        List<String> tags = tagStore.findTopicTags(problem.getJid()).stream().sorted().collect(Collectors.toList());

        HtmlTemplate template = newProblemGeneralTemplate(actor, problem);
        template.setActiveSecondaryTab("view");
        return new ViewProblemView(template, problem, profile, writerUsernames, developerUsernames, testerUsernames, editorialistUsernames, tags);
    }

    @GET
    @Path("/{problemId}/edit")
    @UnitOfWork(readOnly = true)
    public View editProblem(@Context HttpServletRequest req, @PathParam("problemId") int problemId) {
        Actor actor = actorChecker.check(req);
        Problem problem = checkFound(problemStore.getProblemById(problemId));
        checkAllowed(roleChecker.canEdit(actor, problem));

        Map<ProblemSetterRole, List<String>> setters = problemStore.getProblemSetters(problem.getJid());
        Map<String, Profile> profilesMap = profileStore.getProfiles(setters.values()
                .stream()
                .flatMap(List::stream)
                .collect(Collectors.toSet()));

        EditProblemForm form = new EditProblemForm();
        form.slug = problem.getSlug();
        form.additionalNote = problem.getAdditionalNote();
        form.writerUsernames = userJidsToUsernames(setters.get(ProblemSetterRole.WRITER), profilesMap);
        form.developerUsernames = userJidsToUsernames(setters.get(ProblemSetterRole.DEVELOPER), profilesMap);
        form.testerUsernames = userJidsToUsernames(setters.get(ProblemSetterRole.TESTER), profilesMap);
        form.editorialistUsernames = userJidsToUsernames(setters.get(ProblemSetterRole.EDITORIALIST), profilesMap);
        form.tags = tagStore.findTopicTags(problem.getJid());

        return renderEditProblem(actor, problem, form);
    }

    private View renderEditProblem(Actor actor, Problem problem, EditProblemForm form) {
        HtmlTemplate template = newProblemGeneralTemplate(actor, problem);
        template.setActiveSecondaryTab("edit");
        return new EditProblemView(template, form);
    }

    @POST
    @Path("/{problemId}/edit")
    @UnitOfWork
    public Response updateProblem(
            @Context HttpServletRequest req,
            @PathParam("problemId") int problemId,
            @BeanParam EditProblemForm form) {

        Actor actor = actorChecker.check(req);
        Problem problem = checkFound(problemStore.getProblemById(problemId));
        checkAllowed(roleChecker.canEdit(actor, problem));

        if (!problem.getSlug().equals(form.slug) && problemStore.problemExistsBySlug(form.slug)) {
            form.globalError = "Slug already exists.";
            return ok(renderEditProblem(actor, problem, form));
        }

        problemStore.updateProblem(problem.getJid(), form.slug, form.additionalNote);

        Set<String> usernames = new HashSet<>();
        usernames.addAll(Arrays.asList(form.writerUsernames.split(",")));
        usernames.addAll(Arrays.asList(form.developerUsernames.split(",")));
        usernames.addAll(Arrays.asList(form.testerUsernames.split(",")));
        usernames.addAll(Arrays.asList(form.editorialistUsernames.split(",")));
        Map<String, String> jidsMap = userStore.translateUsernamesToJids(usernames);

        Map<ProblemSetterRole, List<String>> setters = problemStore.getProblemSetters(problem.getJid());
        updateProblemSetters(problem.getJid(), ProblemSetterRole.WRITER, form.writerUsernames, setters, jidsMap);
        updateProblemSetters(problem.getJid(), ProblemSetterRole.DEVELOPER, form.developerUsernames, setters, jidsMap);
        updateProblemSetters(problem.getJid(), ProblemSetterRole.TESTER, form.testerUsernames, setters, jidsMap);
        updateProblemSetters(problem.getJid(), ProblemSetterRole.EDITORIALIST, form.editorialistUsernames, setters, jidsMap);

        tagStore.updateTopicTags(problem.getJid(), form.tags);

        return redirect("/problems/" + problemId);
    }

    private String userJidsToUsernames(List<String> userJids, Map<String, Profile> profilesMap) {
        if (userJids == null) {
            return "";
        }
        return userJids.stream()
                .filter(profilesMap::containsKey)
                .map(profilesMap::get)
                .map(Profile::getUsername)
                .collect(Collectors.joining(","));
    }

    private List<String> usernamesToUserJids(String usernames, Map<String, String> jidsMap) {
        if (usernames == null) {
            return ImmutableList.of();
        }
        return Lists.newArrayList(usernames.split(","))
                .stream()
                .filter(jidsMap::containsKey)
                .map(jidsMap::get)
                .collect(Collectors.toList());
    }

    private void updateProblemSetters(
            String problemJid,
            ProblemSetterRole role,
            String usernames,
            Map<ProblemSetterRole, List<String>> setters,
            Map<String, String> jidsMap) {

        List<String> userJids = usernamesToUserJids(usernames, jidsMap);
        if (!userJids.equals(setters.getOrDefault(role, ImmutableList.of()))) {
            problemStore.updateProblemSetters(problemJid, role, userJids);
        }
    }

    private HtmlTemplate newProblemGeneralTemplate(Actor actor, Problem problem) {
        HtmlTemplate template = newProblemTemplate(actor, problem);
        template.setActiveMainTab("general");
        template.addSecondaryTab("view", "View", "/problems/" + problem.getId());
        if (roleChecker.canEdit(actor, problem)) {
            template.addSecondaryTab("edit", "Edit", "/problems/" + problem.getId() + "/edit");
        }
        return template;
    }

    @GET
    @Path("/api/{problemId}/helpers")
    @Produces(APPLICATION_JSON)
    @UnitOfWork(readOnly = true)
    public Response listHelperFilesJson(
            @Context HttpServletRequest req,
            @PathParam("problemId") String problemId) {

        Actor actor = actorChecker.check(req);
        Problem problem = checkFound(findProblem(problemId));
        checkAllowed(roleChecker.canView(actor, problem));

        List<FileInfo> files = programmingProblemStore.getGradingHelperFiles(actor.getUserJid(), problem.getJid());
        List<Map<String, Object>> result = files.stream().map(fi -> {
            Map<String, Object> m = new HashMap<>();
            m.put("name", fi.getName());
            m.put("size", fi.getSize());
            return m;
        }).collect(Collectors.toList());

        return Response.ok(Map.of("files", result)).build();
    }

    @POST
    @Path("/api/{problemId}/helpers/upload")
    @Consumes(MULTIPART_FORM_DATA)
    @Produces(APPLICATION_JSON)
    @UnitOfWork
    public Response uploadHelperFileJson(
            @Context HttpServletRequest req,
            @PathParam("problemId") String problemId,
            @FormDataParam("file") InputStream fileInputStream,
            @FormDataParam("file") FormDataContentDisposition fileMetaData) {

        Actor actor = actorChecker.check(req);
        Problem problem = checkFound(findProblem(problemId));
        checkAllowed(roleChecker.canEdit(actor, problem));

        problemStore.createUserCloneIfNotExists(actor.getUserJid(), problem.getJid());

        if (fileInputStream == null || fileMetaData == null) {
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity(Map.of("message", "No file uploaded."))
                    .build();
        }

        String filename = fileMetaData.getFileName();
        if (filename.toLowerCase().endsWith(".zip")) {
            programmingProblemStore.uploadGradingHelperFileZipped(actor.getUserJid(), problem.getJid(), fileInputStream);
        } else {
            programmingProblemStore.uploadGradingHelperFile(actor.getUserJid(), problem.getJid(), fileInputStream, filename);
        }

        return Response.ok(Map.of("success", true, "message", "Helper file uploaded successfully.")).build();
    }

    @DELETE
    @Path("/api/{problemId}/helpers/{filename}")
    @Produces(APPLICATION_JSON)
    @UnitOfWork
    public Response deleteHelperFileJson(
            @Context HttpServletRequest req,
            @PathParam("problemId") String problemId,
            @PathParam("filename") String filename) {

        Actor actor = actorChecker.check(req);
        Problem problem = checkFound(findProblem(problemId));
        checkAllowed(roleChecker.canEdit(actor, problem));

        problemStore.createUserCloneIfNotExists(actor.getUserJid(), problem.getJid());
        programmingProblemStore.deleteGradingHelperFile(actor.getUserJid(), problem.getJid(), filename);

        return Response.ok(Map.of("success", true, "message", "Helper file deleted successfully.")).build();
    }

    @GET
    @Path("/api/{problemId}/partners")
    @Produces(APPLICATION_JSON)
    @UnitOfWork(readOnly = true)
    public Response listPartnersJson(
            @Context HttpServletRequest req,
            @PathParam("problemId") String problemId) {

        Actor actor = actorChecker.check(req);
        Problem problem = checkFound(findProblem(problemId));
        checkAllowed(roleChecker.canView(actor, problem));

        List<Partner> partners = partnerStore.getPartners(problem.getJid());
        var userJids = Lists.transform(partners, Partner::getUserJid);
        Map<String, Profile> profilesMap = profileStore.getProfiles(userJids);

        List<Map<String, Object>> result = partners.stream().map(p -> {
            Profile prof = profilesMap.get(p.getUserJid());
            Map<String, Object> m = new HashMap<>();
            m.put("userJid", p.getUserJid());
            m.put("username", prof != null ? prof.getUsername() : p.getUserJid());
            m.put("name", prof != null ? prof.getUsername() : "");
            m.put("permission", p.getPermission().name());
            return m;
        }).collect(Collectors.toList());

        return Response.ok(Map.of("partners", result)).build();
    }

    @POST
    @Path("/api/{problemId}/partners")
    @Consumes(APPLICATION_JSON)
    @Produces(APPLICATION_JSON)
    @UnitOfWork
    public Response addOrUpdatePartnerJson(
            @Context HttpServletRequest req,
            @PathParam("problemId") String problemId,
            Map<String, String> body) {

        Actor actor = actorChecker.check(req);
        Problem problem = checkFound(findProblem(problemId));
        checkAllowed(roleChecker.canEdit(actor, problem));

        String username = body.get("username");
        String permStr = body.getOrDefault("permission", "UPDATE");

        if (username == null || username.trim().isEmpty()) {
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity(Map.of("message", "Username is required."))
                    .build();
        }

        var userOpt = userStore.getUserByUsername(username.trim());
        if (userOpt.isEmpty()) {
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity(Map.of("message", "User '" + username + "' not found."))
                    .build();
        }

        PartnerPermission perm;
        try {
            perm = PartnerPermission.valueOf(permStr.toUpperCase());
        } catch (IllegalArgumentException e) {
            perm = PartnerPermission.UPDATE;
        }

        Partner newPartner = new Partner.Builder()
                .userJid(userOpt.get().getJid())
                .permission(perm)
                .build();

        List<Partner> currentPartners = new ArrayList<>(partnerStore.getPartners(problem.getJid()));
        currentPartners.removeIf(p -> p.getUserJid().equals(newPartner.getUserJid()));
        currentPartners.add(newPartner);
        partnerStore.setPartners(problem.getJid(), currentPartners);

        return Response.ok(Map.of("success", true, "message", "Partner updated successfully.")).build();
    }

    @DELETE
    @Path("/api/{problemId}/partners/{username}")
    @Produces(APPLICATION_JSON)
    @UnitOfWork
    public Response deletePartnerJson(
            @Context HttpServletRequest req,
            @PathParam("problemId") String problemId,
            @PathParam("username") String username) {

        Actor actor = actorChecker.check(req);
        Problem problem = checkFound(findProblem(problemId));
        checkAllowed(roleChecker.canEdit(actor, problem));

        var userOpt = userStore.getUserByUsername(username);
        if (userOpt.isPresent()) {
            String targetJid = userOpt.get().getJid();
            List<Partner> currentPartners = new ArrayList<>(partnerStore.getPartners(problem.getJid()));
            currentPartners.removeIf(p -> p.getUserJid().equals(targetJid));
            partnerStore.setPartners(problem.getJid(), currentPartners);
        }

        return Response.ok(Map.of("success", true, "message", "Partner removed successfully.")).build();
    }
}
