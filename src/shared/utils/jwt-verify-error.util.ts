/**
 * Normalizes jsonwebtoken / passport-jwt failures for safe structured logs.
 * Never includes raw tokens.
 */
export function jwtVerifyFailureDetails(infoOrError: unknown): Record<string, string | number | undefined> {
    if (!infoOrError) {
        return { jwtFailure: 'unknown', reason: 'empty_error' };
    }

    if (typeof infoOrError === 'string') {
        return { jwtFailure: 'challenge_string', reason: infoOrError };
    }

    if (infoOrError instanceof Error) {
        const e = infoOrError;
        const base: Record<string, string | number | undefined> = {
            jwtFailure: classifyJwtErrorName(e.name, e.message),
            reason: e.message,
            errorName: e.name,
        };

        if (e.name === 'TokenExpiredError') {
            const expiredAt = (e as { expiredAt?: Date }).expiredAt;
            if (expiredAt) {
                base.expiredAt = expiredAt.toISOString();
            }
        }

        if (e.name === 'NotBeforeError') {
            const date = (e as { date?: Date }).date;
            if (date) {
                base.notBefore = date.toISOString();
            }
        }

        return base;
    }

    return { jwtFailure: 'non_error_challenge', reason: String(infoOrError) };
}

function classifyJwtErrorName(name: string, message?: string): string {
    if (message === 'No auth token') {
        return 'missing_bearer_token';
    }
    switch (name) {
        case 'TokenExpiredError':
            return 'token_expired';
        case 'JsonWebTokenError':
            return 'jwt_malformed_or_bad_signature';
        case 'NotBeforeError':
            return 'token_not_active_yet';
        default:
            if (name === 'Error') {
                return 'generic_error';
            }
            return name ? name.replace(/Error$/, '').toLowerCase() : 'unknown';
    }
}
