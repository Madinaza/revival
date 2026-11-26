package dev.revival.common;

import java.util.Map;
import java.util.TreeMap;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.web.ErrorResponseException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/** Every error leaves the API as an RFC 9457 problem document. */
@RestControllerAdvice
@Order(Ordered.HIGHEST_PRECEDENCE) // before Spring's own handler, which would leave out the field messages
public class Problems {
    public static ErrorResponseException notFound(String what) {
        return of(HttpStatus.NOT_FOUND, what + " was not found.");
    }

    public static ErrorResponseException conflict(String why) {
        return of(HttpStatus.CONFLICT, why);
    }

    public static ErrorResponseException invalid(String field, String why) {
        var body = ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, "Some fields need another look.");
        body.setProperty("fields", Map.of(field, why));
        return new ErrorResponseException(HttpStatus.BAD_REQUEST, body, null);
    }

    public static ErrorResponseException of(HttpStatus status, String detail) {
        return new ErrorResponseException(status, ProblemDetail.forStatusAndDetail(status, detail), null);
    }

    @ExceptionHandler
    ProblemDetail onInvalid(MethodArgumentNotValidException e) {
        var fields = new TreeMap<String, String>();
        e.getBindingResult().getFieldErrors().forEach(f -> fields.putIfAbsent(f.getField(), f.getDefaultMessage()));
        var body = ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, "Some fields need another look.");
        body.setProperty("fields", fields);
        return body;
    }

    @ExceptionHandler
    ProblemDetail onStale(OptimisticLockingFailureException e) {
        return ProblemDetail.forStatusAndDetail(HttpStatus.CONFLICT, "Someone else changed this in the meantime. Reload and try again.");
    }
}
