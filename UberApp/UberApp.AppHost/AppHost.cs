
var builder = DistributedApplication.CreateBuilder(args);

var postgres = builder.AddPostgres("postgres")
                      .WithDataVolume() 
                      .WithPgAdmin();

var db = postgres.AddDatabase("uber-db");

var qdrant = builder.AddQdrant("qdrant")
                      .WithDataVolume();

var backend = builder.AddProject<Projects.UberApi>("uberapi")
       .WithReference(db)
       .WithReference(qdrant);

builder.AddViteApp(name: "frontend", appDirectory: "../frontend")
    .WithReference(backend)
    .WaitFor(backend);

builder.Build().Run();
