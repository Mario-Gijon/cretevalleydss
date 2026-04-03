/**
 * @openapi
 * components:
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 *
 *   schemas:
 *     SuccessMessage:
 *       type: object
 *       required:
 *         - success
 *         - msg
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         msg:
 *           type: string
 *           example: Operation completed successfully
 *
 *     GenericError:
 *       type: object
 *       required:
 *         - success
 *         - msg
 *       properties:
 *         success:
 *           type: boolean
 *           example: false
 *         msg:
 *           type: string
 *           example: Internal server error
 *
 *     AuthError:
 *       type: object
 *       required:
 *         - success
 *         - msg
 *       properties:
 *         success:
 *           type: boolean
 *           example: false
 *         msg:
 *           type: string
 *           example: Token expired
 *         code:
 *           type: string
 *           nullable: true
 *           example: TOKEN_EXPIRED
 *
 *     ValidationErrors:
 *       type: object
 *       required:
 *         - errors
 *       properties:
 *         success:
 *           type: boolean
 *           example: false
 *         errors:
 *           type: object
 *           additionalProperties:
 *             type: string
 *           example:
 *             email: Invalid email
 *             password: Passwords do not match
 *
 *     AuthProfile:
 *       type: object
 *       required:
 *         - success
 *         - university
 *         - name
 *         - email
 *         - accountCreation
 *         - role
 *         - isAdmin
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         university:
 *           type: string
 *           example: Universidad de Granada
 *         name:
 *           type: string
 *           example: Mario
 *         email:
 *           type: string
 *           format: email
 *           example: mario@example.com
 *         accountCreation:
 *           type: string
 *           nullable: true
 *           example: 7 of February, 2026
 *         role:
 *           type: string
 *           example: user
 *         isAdmin:
 *           type: boolean
 *           example: false
 *
 *     LoginRequest:
 *       type: object
 *       required:
 *         - email
 *         - password
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           example: mario@example.com
 *         password:
 *           type: string
 *           format: password
 *           example: secret123
 *
 *     LoginResponse:
 *       type: object
 *       required:
 *         - success
 *         - msg
 *         - token
 *         - expiresIn
 *         - role
 *         - isAdmin
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         msg:
 *           type: string
 *           example: Login successful
 *         token:
 *           type: string
 *           example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *         expiresIn:
 *           oneOf:
 *             - type: integer
 *             - type: string
 *           example: 3600
 *         role:
 *           type: string
 *           example: user
 *         isAdmin:
 *           type: boolean
 *           example: false
 *
 *     SignupRequest:
 *       type: object
 *       required:
 *         - name
 *         - university
 *         - email
 *         - password
 *       properties:
 *         name:
 *           type: string
 *           example: Mario
 *         university:
 *           type: string
 *           example: Universidad de Granada
 *         email:
 *           type: string
 *           format: email
 *           example: mario@example.com
 *         password:
 *           type: string
 *           format: password
 *           example: secret123
 *
 *     UpdatePasswordRequest:
 *       type: object
 *       required:
 *         - newPassword
 *         - repeatNewPassword
 *       properties:
 *         newPassword:
 *           type: string
 *           format: password
 *           example: newSecret123
 *         repeatNewPassword:
 *           type: string
 *           format: password
 *           example: newSecret123
 *
 *     UpdateNameRequest:
 *       type: object
 *       required:
 *         - newName
 *       properties:
 *         newName:
 *           type: string
 *           example: Mario Gijón
 *
 *     UpdateUniversityRequest:
 *       type: object
 *       required:
 *         - newUniversity
 *       properties:
 *         newUniversity:
 *           type: string
 *           example: Universidad de Granada
 *
 *     UpdateEmailRequest:
 *       type: object
 *       required:
 *         - newEmail
 *       properties:
 *         newEmail:
 *           type: string
 *           format: email
 *           example: mario.new@example.com
 *
 *     ExpressionDomainNumericRange:
 *       type: object
 *       properties:
 *         min:
 *           type: number
 *           nullable: true
 *           example: 0
 *         max:
 *           type: number
 *           nullable: true
 *           example: 1
 *
 *     ExpressionDomainLinguisticLabel:
 *       type: object
 *       required:
 *         - label
 *         - values
 *       properties:
 *         label:
 *           type: string
 *           example: Low
 *         values:
 *           type: array
 *           items:
 *             type: number
 *           example: [0, 0, 0.25]
 *
 *     ExpressionDomain:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           example: 67d1f0a2c3b4567890abcd12
 *         user:
 *           type: string
 *           nullable: true
 *           example: 67d1f0a2c3b4567890abcd34
 *         name:
 *           type: string
 *           example: Numeric 0-1
 *         isGlobal:
 *           type: boolean
 *           example: true
 *         locked:
 *           type: boolean
 *           example: true
 *         type:
 *           type: string
 *           enum: [numeric, linguistic]
 *           example: numeric
 *         numericRange:
 *           $ref: '#/components/schemas/ExpressionDomainNumericRange'
 *         linguisticLabels:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/ExpressionDomainLinguisticLabel'
 *         createdAt:
 *           type: string
 *           format: date-time
 *           nullable: true
 *
 *     ExpressionDomainResponse:
 *       type: object
 *       required:
 *         - success
 *         - msg
 *         - data
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         msg:
 *           type: string
 *           example: Domain created successfully
 *         data:
 *           $ref: '#/components/schemas/ExpressionDomain'
 *
 *     SimpleListResponse:
 *       type: object
 *       required:
 *         - success
 *         - data
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         data:
 *           type: array
 *           items:
 *             type: object
 *
 *   responses:
 *     Unauthorized:
 *       description: Usuario no autenticado o token inválido
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AuthError'
 *
 *     Forbidden:
 *       description: Usuario autenticado pero sin permisos suficientes
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/GenericError'
 *
 *     ValidationFailed:
 *       description: Error de validación de entrada
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ValidationErrors'
 *
 *     GenericServerError:
 *       description: Error interno del servidor
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/GenericError'
 */
export {};