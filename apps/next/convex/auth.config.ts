const clientId = process.env.WORKOS_CLIENT_ID;

const authConfig = {
  providers: [
    {
      type: "customJwt",
      issuer: `https://auth.rift.mx/`,
      algorithm: "RS256",
      applicationID: clientId,
      jwks: `https://auth.rift.mx/sso/jwks/${clientId}`,
    },
    {
      type: "customJwt",
      issuer: `https://auth.rift.mx/user_management/${clientId}`,
      algorithm: "RS256",
      jwks: `https://auth.rift.mx/sso/jwks/${clientId}`,
      applicationID: clientId,
    },
  ],
};

export default authConfig;
