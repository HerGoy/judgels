package judgels.michael.lesson;

import static jakarta.ws.rs.core.MediaType.APPLICATION_JSON;
import static jakarta.ws.rs.core.MediaType.MULTIPART_FORM_DATA;
import static judgels.service.ServiceUtils.checkAllowed;
import static judgels.service.ServiceUtils.checkFound;

import com.google.common.collect.Lists;
import io.dropwizard.hibernate.UnitOfWork;
import io.dropwizard.views.common.View;
import jakarta.inject.Inject;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.ws.rs.BeanParam;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.DELETE;
import jakarta.ws.rs.DefaultValue;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.PUT;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.QueryParam;
import jakarta.ws.rs.core.Context;
import jakarta.ws.rs.core.Response;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import judgels.api.actor.Actor;
import judgels.api.lesson.Lesson;
import judgels.api.lesson.LessonStatement;
import judgels.api.profile.Profile;
import judgels.michael.template.HtmlTemplate;
import judgels.michael.template.SearchLessonsWidget;
import judgels.persistence.api.Page;

@Path("/lessons")
public class LessonResource extends BaseLessonResource {
    private static final int PAGE_SIZE = 20;

    @Inject public LessonResource() {}

    @GET
    @UnitOfWork(readOnly = true)
    public View listProblems(
            @Context HttpServletRequest req,
            @QueryParam("page") @DefaultValue("1") int pageNumber,
            @QueryParam("term") @DefaultValue("") String termFilter) {

        Actor actor = actorChecker.check(req);
        boolean isAdmin = roleChecker.isAdmin(actor);
        boolean isWriter = roleChecker.isWriter(actor);

        Optional<String> userJid = isAdmin ? Optional.empty() : Optional.of(actor.getUserJid());
        Page<Lesson> lessons = lessonStore.getLessons(userJid, termFilter, pageNumber, PAGE_SIZE);

        var userJids = Lists.transform(lessons.getPage(), Lesson::getAuthorJid);
        Map<String, Profile> profilesMap = profileStore.getProfiles(userJids);

        HtmlTemplate template = newLessonsTemplate(actor);
        template.setTitle("Lessons");
        if (isWriter) {
            template.addMainButton("New lesson", "/lessons/new");
        }
        template.setSearchLessonsWidget(new SearchLessonsWidget(pageNumber, termFilter));
        return new ListLessonsView(template, lessons, termFilter, profilesMap);
    }

    @GET
    @Path("/new")
    @UnitOfWork(readOnly = true)
    public View newLesson(@Context HttpServletRequest req) {
        Actor actor = actorChecker.check(req);
        checkAllowed(roleChecker.isWriter(actor));

        NewLessonForm form = new NewLessonForm();
        form.initialLanguage = "en-US";

        return renderNewLesson(actor, form);
    }

    public View renderNewLesson(Actor actor, NewLessonForm form) {
        HtmlTemplate template = newLessonsTemplate(actor);
        template.setTitle("New lesson");
        return new NewLessonView(template, form);
    }

    @POST
    @Path("/new")
    @UnitOfWork
    public Response createLesson(@Context HttpServletRequest req, @BeanParam NewLessonForm form) {
        Actor actor = actorChecker.check(req);
        checkAllowed(roleChecker.isWriter(actor));

        if (lessonStore.lessonExistsBySlug(form.slug)) {
            form.globalError = "Slug already exists.";
            return ok(renderNewLesson(actor, form));
        }

        Lesson lesson = lessonStore.createLesson(form.slug, form.additionalNote);

        statementStore.initStatements(lesson.getJid(), form.initialLanguage);

        lessonStore.initRepository(actor.getUserJid(), lesson.getJid());

        setCurrentStatementLanguage(req, form.initialLanguage);
        return redirect("/lessons/" + lesson.getId() + "/statements");
    }

    @GET
    @Path("/{lessonId}")
    @UnitOfWork(readOnly = true)
    public View viewLesson(@Context HttpServletRequest req, @PathParam("lessonId") int lessonId) {
        Actor actor = actorChecker.check(req);
        Lesson lesson = checkFound(lessonStore.getLessonById(lessonId));
        checkAllowed(roleChecker.canView(actor, lesson));

        Profile profile = profileStore.getProfile(lesson.getAuthorJid());

        HtmlTemplate template = newLessonGeneralTemplate(actor, lesson);
        template.setActiveSecondaryTab("view");
        return new ViewLessonView(template, lesson, profile);
    }

    @GET
    @Path("/{lessonId}/edit")
    @UnitOfWork(readOnly = true)
    public View editLesson(@Context HttpServletRequest req, @PathParam("lessonId") int lessonId) {
        Actor actor = actorChecker.check(req);
        Lesson lesson = checkFound(lessonStore.getLessonById(lessonId));
        checkAllowed(roleChecker.canEdit(actor, lesson));

        EditLessonForm form = new EditLessonForm();
        form.slug = lesson.getSlug();
        form.additionalNote = lesson.getAdditionalNote();

        return renderEditLesson(actor, lesson, form);
    }

    private View renderEditLesson(Actor actor, Lesson lesson, EditLessonForm form) {
        HtmlTemplate template = newLessonGeneralTemplate(actor, lesson);
        template.setActiveSecondaryTab("edit");
        return new EditLessonView(template, form);
    }

    @POST
    @Path("/{lessonId}/edit")
    @UnitOfWork
    public Response updateLesson(
            @Context HttpServletRequest req,
            @PathParam("lessonId") int lessonId,
            @BeanParam EditLessonForm form) {

        Actor actor = actorChecker.check(req);
        Lesson lesson = checkFound(lessonStore.getLessonById(lessonId));
        checkAllowed(roleChecker.canEdit(actor, lesson));

        if (!lesson.getSlug().equals(form.slug) && lessonStore.lessonExistsBySlug(form.slug)) {
            form.globalError = "Slug already exists.";
            return ok(renderEditLesson(actor, lesson, form));
        }

        lessonStore.updateLesson(lesson.getJid(), form.slug, form.additionalNote);

        return redirect("/lessons/" + lessonId);
    }

    private HtmlTemplate newLessonGeneralTemplate(Actor actor, Lesson lesson) {
        HtmlTemplate template = newLessonTemplate(actor, lesson);
        template.setActiveMainTab("general");
        template.addSecondaryTab("view", "View", "/lessons/" + lesson.getId());
        if (roleChecker.canEdit(actor, lesson)) {
            template.addSecondaryTab("edit", "Edit", "/lessons/" + lesson.getId() + "/edit");
        }
        return template;
    }

    @GET
    @Path("/api")
    @Produces(APPLICATION_JSON)
    @UnitOfWork(readOnly = true)
    public Response listLessonsJson(
            @Context HttpServletRequest req,
            @QueryParam("page") @DefaultValue("1") int pageNumber,
            @QueryParam("term") @DefaultValue("") String termFilter) {

        Actor actor = actorChecker.check(req);
        boolean isAdmin = roleChecker.isAdmin(actor);

        Optional<String> userJid = isAdmin ? Optional.empty() : Optional.of(actor.getUserJid());
        Page<Lesson> lessons = lessonStore.getLessons(userJid, termFilter, pageNumber, PAGE_SIZE);

        var userJids = Lists.transform(lessons.getPage(), Lesson::getAuthorJid);
        Map<String, Profile> profilesMap = profileStore.getProfiles(userJids);

        List<Map<String, Object>> data = new ArrayList<>();
        for (Lesson l : lessons.getPage()) {
            Profile p = profilesMap.get(l.getAuthorJid());
            Map<String, Object> m = new HashMap<>();
            m.put("id", l.getId());
            m.put("jid", l.getJid());
            m.put("slug", l.getSlug());
            m.put("additionalNote", l.getAdditionalNote());
            m.put("authorUsername", p != null ? p.getUsername() : "-");
            m.put("updatedAt", l.getLastUpdateTime() != null ? l.getLastUpdateTime().toEpochMilli() : null);
            data.add(m);
        }

        Map<String, Object> res = new HashMap<>();
        res.put("data", data);
        res.put("total", lessons.getTotalCount());
        res.put("page", pageNumber);
        return Response.ok(res).build();
    }

    @POST
    @Path("/api")
    @Consumes(APPLICATION_JSON)
    @Produces(APPLICATION_JSON)
    @UnitOfWork
    public Response createLessonJson(
            @Context HttpServletRequest req,
            Map<String, Object> body) {

        Actor actor = actorChecker.check(req);
        checkAllowed(roleChecker.isWriter(actor));

        String slug = (String) body.get("slug");
        if (slug == null || slug.trim().isEmpty()) {
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity(Map.of("message", "Slug is required."))
                    .build();
        }
        slug = slug.trim();
        if (lessonStore.lessonExistsBySlug(slug)) {
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity(Map.of("message", "Slug '" + slug + "' already exists."))
                    .build();
        }

        String additionalNote = (String) body.getOrDefault("additionalNote", "");
        String title = (String) body.getOrDefault("title", slug);
        String text = (String) body.getOrDefault("text", "# " + title + "\n\nTulis isi materi di sini.");
        String language = (String) body.getOrDefault("language", "en-US");

        Lesson lesson = lessonStore.createLesson(slug, additionalNote);
        statementStore.initStatements(lesson.getJid(), language);
        statementStore.updateStatement(null, lesson.getJid(), language, new LessonStatement.Builder()
                .title(title)
                .text(text)
                .build());
        lessonStore.initRepository(actor.getUserJid(), lesson.getJid());

        return Response.ok(Map.of(
                "success", true,
                "id", lesson.getId(),
                "jid", lesson.getJid(),
                "slug", lesson.getSlug(),
                "message", "Lesson created successfully."
        )).build();
    }

    @GET
    @Path("/api/{lessonId}")
    @Produces(APPLICATION_JSON)
    @UnitOfWork(readOnly = true)
    public Response getLessonDetailJson(
            @Context HttpServletRequest req,
            @PathParam("lessonId") String lessonId) {

        Actor actor = actorChecker.check(req);
        Lesson lesson;
        try {
            long id = Long.parseLong(lessonId);
            lesson = checkFound(lessonStore.getLessonById(id));
        } catch (NumberFormatException e) {
            lesson = checkFound(lessonStore.getLessonBySlug(lessonId));
        }
        checkAllowed(roleChecker.canView(actor, lesson));

        String language = statementStore.getDefaultLanguage(actor.getUserJid(), lesson.getJid());
        LessonStatement statement = statementStore.getStatement(actor.getUserJid(), lesson.getJid(), language);
        Profile profile = profileStore.getProfile(lesson.getAuthorJid());

        Map<String, Object> res = new HashMap<>();
        res.put("id", lesson.getId());
        res.put("jid", lesson.getJid());
        res.put("slug", lesson.getSlug());
        res.put("additionalNote", lesson.getAdditionalNote());
        res.put("authorUsername", profile != null ? profile.getUsername() : "-");
        res.put("updatedAt", lesson.getLastUpdateTime() != null ? lesson.getLastUpdateTime().toEpochMilli() : null);
        res.put("title", statement.getTitle());
        res.put("text", statement.getText());
        res.put("language", language);
        res.put("canEdit", roleChecker.canEdit(actor, lesson));

        return Response.ok(res).build();
    }

    @PUT
    @Path("/api/{lessonId}")
    @Consumes(APPLICATION_JSON)
    @Produces(APPLICATION_JSON)
    @UnitOfWork
    public Response updateLessonJson(
            @Context HttpServletRequest req,
            @PathParam("lessonId") String lessonId,
            Map<String, Object> body) {

        Actor actor = actorChecker.check(req);
        Lesson lesson;
        try {
            long id = Long.parseLong(lessonId);
            lesson = checkFound(lessonStore.getLessonById(id));
        } catch (NumberFormatException e) {
            lesson = checkFound(lessonStore.getLessonBySlug(lessonId));
        }
        checkAllowed(roleChecker.canEdit(actor, lesson));

        String newSlug = (String) body.get("slug");
        String additionalNote = (String) body.get("additionalNote");
        if (newSlug != null && !newSlug.isBlank() && !newSlug.equals(lesson.getSlug())) {
            if (lessonStore.lessonExistsBySlug(newSlug.trim())) {
                return Response.status(Response.Status.BAD_REQUEST)
                        .entity(Map.of("message", "Slug '" + newSlug + "' already exists."))
                        .build();
            }
            newSlug = newSlug.trim();
        } else {
            newSlug = lesson.getSlug();
        }
        if (additionalNote == null) {
            additionalNote = lesson.getAdditionalNote();
        }
        lessonStore.updateLesson(lesson.getJid(), newSlug, additionalNote);

        String title = (String) body.get("title");
        String text = (String) body.get("text");
        String language = (String) body.getOrDefault("language", statementStore.getDefaultLanguage(actor.getUserJid(), lesson.getJid()));

        if (title != null || text != null) {
            lessonStore.createUserCloneIfNotExists(actor.getUserJid(), lesson.getJid());
            LessonStatement currentStatement = statementStore.getStatement(actor.getUserJid(), lesson.getJid(), language);
            String finalTitle = title != null ? title : currentStatement.getTitle();
            String finalText = text != null ? text : currentStatement.getText();

            statementStore.updateStatement(actor.getUserJid(), lesson.getJid(), language, new LessonStatement.Builder()
                    .title(finalTitle)
                    .text(finalText)
                    .build());
        }

        return Response.ok(Map.of("success", true, "message", "Lesson updated successfully.")).build();
    }

    @DELETE
    @Path("/api/{lessonId}")
    @Produces(APPLICATION_JSON)
    @UnitOfWork
    public Response deleteLessonJson(
            @Context HttpServletRequest req,
            @PathParam("lessonId") String lessonId) {

        Actor actor = actorChecker.check(req);
        Lesson lesson;
        try {
            long id = Long.parseLong(lessonId);
            lesson = checkFound(lessonStore.getLessonById(id));
        } catch (NumberFormatException e) {
            lesson = checkFound(lessonStore.getLessonBySlug(lessonId));
        }
        checkAllowed(roleChecker.canEdit(actor, lesson));

        lessonStore.deleteLesson(lesson.getJid());
        return Response.ok(Map.of("success", true, "message", "Lesson deleted successfully.")).build();
    }

    @GET
    @Path("/api/by-slug/{slug}")
    @Produces(APPLICATION_JSON)
    @UnitOfWork(readOnly = true)
    public Response getLessonBySlugJson(
            @Context HttpServletRequest req,
            @PathParam("slug") String slug) {

        actorChecker.check(req);
        Optional<Lesson> opt = lessonStore.getLessonBySlug(slug);
        if (opt.isEmpty()) {
            return Response.status(Response.Status.NOT_FOUND)
                    .entity(Map.of("message", "Lesson not found"))
                    .build();
        }
        Lesson l = opt.get();
        return Response.ok(Map.of("id", l.getId(), "jid", l.getJid(), "slug", l.getSlug())).build();
    }
}
