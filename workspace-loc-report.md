# Workspace LOC appendix

This appendix is generated from the current workspace. The report file itself is excluded from all counts.

## Method

Physical UTF-8 lines, including blanks and comments. Excludes caches, node_modules, build output, and binary/media/database files. Generated outputs are separated from authored source.

## Totals

| Scope | Files | LOC |
|---|---:|---:|
| All included text files before this report | 462 | 94,898 |
| Primary authored product/runtime files | 375 | 81,093 |

## Category totals

| Category | Files | LOC |
|---|---:|---:|
| Frontend - Cosmos | 163 | 57,546 |
| Workspace config/docs | 31 | 10,278 |
| Backend - API server | 99 | 10,911 |
| Mockup artifact | 70 | 6,703 |
| Standalone Cosmic Run | 3 | 2,886 |
| Generated clients/schemas | 47 | 2,322 |
| Video artifact | 23 | 1,492 |
| Shared libraries/API contracts | 15 | 1,317 |
| Text assets/prompts | 5 | 1,197 |
| Workspace scripts | 6 | 246 |

## Frontend - Cosmos

163 files / 57,546 LOC

| LOC | File |
|---:|---|
| 563 | SingularityChat.tsx |
| 3,766 | artifacts/cosmos/src/App.tsx |
| 769 | artifacts/cosmos/src/components/AISummary.tsx |
| 91 | artifacts/cosmos/src/components/AgeGateModal.tsx |
| 104 | artifacts/cosmos/src/components/BannerCarousel.tsx |
| 208 | artifacts/cosmos/src/components/BigBangIntro.tsx |
| 875 | artifacts/cosmos/src/components/CompareDialog.tsx |
| 420 | artifacts/cosmos/src/components/Cosmic3DViewerModal.tsx |
| 937 | artifacts/cosmos/src/components/CosmicCards.tsx |
| 1,121 | artifacts/cosmos/src/components/CosmicCarrom.tsx |
| 91 | artifacts/cosmos/src/components/CosmicGalaxyBanner.tsx |
| 2,828 | artifacts/cosmos/src/components/CosmicNexus.tsx |
| 326 | artifacts/cosmos/src/components/CosmicProfile.tsx |
| 35 | artifacts/cosmos/src/components/CosmicRun.tsx |
| 574 | artifacts/cosmos/src/components/DiscoveryPanel.tsx |
| 199 | artifacts/cosmos/src/components/DocumentChip.tsx |
| 184 | artifacts/cosmos/src/components/ExploreFurther.tsx |
| 759 | artifacts/cosmos/src/components/GrandmasterChess.tsx |
| 502 | artifacts/cosmos/src/components/GreatObservatories.tsx |
| 89 | artifacts/cosmos/src/components/ImageAttachmentGrid.tsx |
| 487 | artifacts/cosmos/src/components/LibraryView.tsx |
| 316 | artifacts/cosmos/src/components/LoginScreen.tsx |
| 2,412 | artifacts/cosmos/src/components/NasaSearch.tsx |
| 642 | artifacts/cosmos/src/components/ProfileModal.tsx |
| 1,330 | artifacts/cosmos/src/components/SavedPapersDrawer.tsx |
| 422 | artifacts/cosmos/src/components/SearchHeroCarousel.tsx |
| 632 | artifacts/cosmos/src/components/SearchKnowledgePanel.tsx |
| 776 | artifacts/cosmos/src/components/SimulationSearch.tsx |
| 4,048 | artifacts/cosmos/src/components/SingularityChat.tsx |
| 180 | artifacts/cosmos/src/components/SingularityLaunchButton.tsx |
| 229 | artifacts/cosmos/src/components/SingularityModeSelector.tsx |
| 873 | artifacts/cosmos/src/components/SingularitySidebar.tsx |
| 505 | artifacts/cosmos/src/components/SourceLogos.tsx |
| 971 | artifacts/cosmos/src/components/UniversalGallery.tsx |
| 117 | artifacts/cosmos/src/components/VideoPlayerModal.tsx |
| 456 | artifacts/cosmos/src/components/VoiceModeOverlay.tsx |
| 57 | artifacts/cosmos/src/components/WarpIntro.tsx |
| 271 | artifacts/cosmos/src/components/WorkspacePanel.tsx |
| 173 | artifacts/cosmos/src/components/biology-hub/BioDNAIcon.tsx |
| 464 | artifacts/cosmos/src/components/biology-hub/BioHeader.tsx |
| 175 | artifacts/cosmos/src/components/biology-hub/BioHeroCard.tsx |
| 652 | artifacts/cosmos/src/components/biology-hub/BioMainContent.tsx |
| 201 | artifacts/cosmos/src/components/biology-hub/BioParticles.tsx |
| 184 | artifacts/cosmos/src/components/biology-hub/BioSidebar.tsx |
| 349 | artifacts/cosmos/src/components/biology-hub/BiologyHub.tsx |
| 849 | artifacts/cosmos/src/components/biology-hub/anatomy3d/Anatomy3DViewer.tsx |
| 452 | artifacts/cosmos/src/components/biology-hub/anatomy3d/PremiumLibrary.tsx |
| 158 | artifacts/cosmos/src/components/biology-hub/anatomy3d/organData.ts |
| 68 | artifacts/cosmos/src/components/biology-hub/anatomy3d/premiumData.ts |
| 502 | artifacts/cosmos/src/components/biology-hub/sections/BioSearchResults.tsx |
| 954 | artifacts/cosmos/src/components/biology-hub/sections/FeelNatureSection.tsx |
| 1,076 | artifacts/cosmos/src/components/biology-hub/sections/MicroscopeSection.tsx |
| 382 | artifacts/cosmos/src/components/biology-hub/sections/ResearchSection.tsx |
| 435 | artifacts/cosmos/src/components/biology-hub/sections/SimulationsSection.tsx |
| 822 | artifacts/cosmos/src/components/biology-hub/sections/TopicSection.tsx |
| 182 | artifacts/cosmos/src/components/biology-hub/sections/VideosSection.tsx |
| 803 | artifacts/cosmos/src/components/biology-hub/sections/natureGalleryData.ts |
| 183 | artifacts/cosmos/src/components/biology-hub/types.ts |
| 146 | artifacts/cosmos/src/components/cosmic-atelier/CosmicAtelier.tsx |
| 75 | artifacts/cosmos/src/components/cosmic-atelier/CosmicAtelierEntry.tsx |
| 67 | artifacts/cosmos/src/components/cosmic-atelier/CosmicAtelierMark.tsx |
| 82 | artifacts/cosmos/src/components/cosmic-atelier/CosmicAvatarCard.tsx |
| 302 | artifacts/cosmos/src/components/cosmic-atelier/CosmicAvatarDetail.tsx |
| 131 | artifacts/cosmos/src/components/cosmic-atelier/cosmicAtelierCatalog.ts |
| 116 | artifacts/cosmos/src/components/settings/SingularitySettingsPage.tsx |
| 54 | artifacts/cosmos/src/components/ui/accordion.tsx |
| 138 | artifacts/cosmos/src/components/ui/alert-dialog.tsx |
| 58 | artifacts/cosmos/src/components/ui/alert.tsx |
| 5 | artifacts/cosmos/src/components/ui/aspect-ratio.tsx |
| 49 | artifacts/cosmos/src/components/ui/avatar.tsx |
| 42 | artifacts/cosmos/src/components/ui/badge.tsx |
| 114 | artifacts/cosmos/src/components/ui/breadcrumb.tsx |
| 82 | artifacts/cosmos/src/components/ui/button-group.tsx |
| 64 | artifacts/cosmos/src/components/ui/button.tsx |
| 212 | artifacts/cosmos/src/components/ui/calendar.tsx |
| 82 | artifacts/cosmos/src/components/ui/card.tsx |
| 259 | artifacts/cosmos/src/components/ui/carousel.tsx |
| 366 | artifacts/cosmos/src/components/ui/chart.tsx |
| 27 | artifacts/cosmos/src/components/ui/checkbox.tsx |
| 11 | artifacts/cosmos/src/components/ui/collapsible.tsx |
| 152 | artifacts/cosmos/src/components/ui/command.tsx |
| 197 | artifacts/cosmos/src/components/ui/context-menu.tsx |
| 119 | artifacts/cosmos/src/components/ui/dialog.tsx |
| 115 | artifacts/cosmos/src/components/ui/drawer.tsx |
| 200 | artifacts/cosmos/src/components/ui/dropdown-menu.tsx |
| 103 | artifacts/cosmos/src/components/ui/empty.tsx |
| 243 | artifacts/cosmos/src/components/ui/field.tsx |
| 178 | artifacts/cosmos/src/components/ui/form.tsx |
| 26 | artifacts/cosmos/src/components/ui/hover-card.tsx |
| 167 | artifacts/cosmos/src/components/ui/input-group.tsx |
| 68 | artifacts/cosmos/src/components/ui/input-otp.tsx |
| 21 | artifacts/cosmos/src/components/ui/input.tsx |
| 192 | artifacts/cosmos/src/components/ui/item.tsx |
| 28 | artifacts/cosmos/src/components/ui/kbd.tsx |
| 25 | artifacts/cosmos/src/components/ui/label.tsx |
| 253 | artifacts/cosmos/src/components/ui/menubar.tsx |
| 127 | artifacts/cosmos/src/components/ui/navigation-menu.tsx |
| 116 | artifacts/cosmos/src/components/ui/pagination.tsx |
| 30 | artifacts/cosmos/src/components/ui/popover.tsx |
| 27 | artifacts/cosmos/src/components/ui/progress.tsx |
| 41 | artifacts/cosmos/src/components/ui/radio-group.tsx |
| 44 | artifacts/cosmos/src/components/ui/resizable.tsx |
| 45 | artifacts/cosmos/src/components/ui/scroll-area.tsx |
| 158 | artifacts/cosmos/src/components/ui/select.tsx |
| 28 | artifacts/cosmos/src/components/ui/separator.tsx |
| 139 | artifacts/cosmos/src/components/ui/sheet.tsx |
| 726 | artifacts/cosmos/src/components/ui/sidebar.tsx |
| 15 | artifacts/cosmos/src/components/ui/skeleton.tsx |
| 25 | artifacts/cosmos/src/components/ui/slider.tsx |
| 31 | artifacts/cosmos/src/components/ui/sonner.tsx |
| 15 | artifacts/cosmos/src/components/ui/spinner.tsx |
| 26 | artifacts/cosmos/src/components/ui/switch.tsx |
| 119 | artifacts/cosmos/src/components/ui/table.tsx |
| 52 | artifacts/cosmos/src/components/ui/tabs.tsx |
| 21 | artifacts/cosmos/src/components/ui/textarea.tsx |
| 126 | artifacts/cosmos/src/components/ui/toast.tsx |
| 33 | artifacts/cosmos/src/components/ui/toaster.tsx |
| 60 | artifacts/cosmos/src/components/ui/toggle-group.tsx |
| 42 | artifacts/cosmos/src/components/ui/toggle.tsx |
| 31 | artifacts/cosmos/src/components/ui/tooltip.tsx |
| 33 | artifacts/cosmos/src/context/AuthContext.tsx |
| 196 | artifacts/cosmos/src/data/gameCatalog.ts |
| 207 | artifacts/cosmos/src/data/observatories.ts |
| 352 | artifacts/cosmos/src/features/game-store/GameStore.tsx |
| 259 | artifacts/cosmos/src/features/mission-quiz/MissionCenter.tsx |
| 217 | artifacts/cosmos/src/features/mission-quiz/MissionQuizController.tsx |
| 149 | artifacts/cosmos/src/features/mission-quiz/PhysicsQuiz.tsx |
| 258 | artifacts/cosmos/src/features/mission-quiz/api.ts |
| 5 | artifacts/cosmos/src/features/mission-quiz/index.ts |
| 99 | artifacts/cosmos/src/features/royalty/RoyaltyIcons.tsx |
| 161 | artifacts/cosmos/src/features/royalty/RoyaltyView.tsx |
| 26 | artifacts/cosmos/src/features/royalty/ownership.ts |
| 58 | artifacts/cosmos/src/features/royalty/royalty.ts |
| 45 | artifacts/cosmos/src/features/royalty/wallet.ts |
| 21 | artifacts/cosmos/src/hooks/use-mobile.tsx |
| 187 | artifacts/cosmos/src/hooks/use-toast.ts |
| 114 | artifacts/cosmos/src/hooks/useDiscovery.ts |
| 146 | artifacts/cosmos/src/hooks/useDocumentIngestion.ts |
| 74 | artifacts/cosmos/src/hooks/useImageAttachments.ts |
| 227 | artifacts/cosmos/src/hooks/useResearchWorkspace.ts |
| 89 | artifacts/cosmos/src/hooks/useSavedPapers.ts |
| 6,326 | artifacts/cosmos/src/index.css |
| 177 | artifacts/cosmos/src/lib/advancedSearch.ts |
| 34 | artifacts/cosmos/src/lib/attachmentTypes.ts |
| 136 | artifacts/cosmos/src/lib/chunkManager.ts |
| 135 | artifacts/cosmos/src/lib/contextSelector.ts |
| 174 | artifacts/cosmos/src/lib/docIngestion.ts |
| 65 | artifacts/cosmos/src/lib/documentStore.ts |
| 918 | artifacts/cosmos/src/lib/edgeTts.ts |
| 233 | artifacts/cosmos/src/lib/imageAttachments.ts |
| 68 | artifacts/cosmos/src/lib/promptBuilder.ts |
| 40 | artifacts/cosmos/src/lib/responseSanitizer.ts |
| 605 | artifacts/cosmos/src/lib/singularityChatHistory.ts |
| 73 | artifacts/cosmos/src/lib/singularityModes.ts |
| 62 | artifacts/cosmos/src/lib/singularitySettings.ts |
| 41 | artifacts/cosmos/src/lib/supabase.ts |
| 7 | artifacts/cosmos/src/lib/utils.ts |
| 22 | artifacts/cosmos/src/lib/visualReferences.ts |
| 25 | artifacts/cosmos/src/main.tsx |
| 23 | artifacts/cosmos/src/pages/not-found.tsx |
| 201 | artifacts/cosmos/src/services/observatoryApi.ts |
| 227 | artifacts/cosmos/src/store/authStore.ts |
| 156 | artifacts/cosmos/src/utils/citationFormatters.ts |

## Backend - API server

99 files / 10,911 LOC

| LOC | File |
|---:|---|
| 46 | artifacts/api-server/src/app.ts |
| 37 | artifacts/api-server/src/index.ts |
| 0 | artifacts/api-server/src/lib/.gitkeep |
| 1,334 | artifacts/api-server/src/lib/aggregator.ts |
| 981 | artifacts/api-server/src/lib/astronomy.ts |
| 365 | artifacts/api-server/src/lib/db.ts |
| 46 | artifacts/api-server/src/lib/gallery/providers/artic.ts |
| 2 | artifacts/api-server/src/lib/gallery/providers/arxiv.ts |
| 2 | artifacts/api-server/src/lib/gallery/providers/bfi.ts |
| 60 | artifacts/api-server/src/lib/gallery/providers/bing.ts |
| 2 | artifacts/api-server/src/lib/gallery/providers/biodiversity-heritage-library.ts |
| 2 | artifacts/api-server/src/lib/gallery/providers/bioimages.ts |
| 2 | artifacts/api-server/src/lib/gallery/providers/british-library.ts |
| 2 | artifacts/api-server/src/lib/gallery/providers/cdc-public-health-image-library.ts |
| 45 | artifacts/api-server/src/lib/gallery/providers/cleveland.ts |
| 2 | artifacts/api-server/src/lib/gallery/providers/crossref.ts |
| 49 | artifacts/api-server/src/lib/gallery/providers/danbooru.ts |
| 2 | artifacts/api-server/src/lib/gallery/providers/digital-public-library.ts |
| 2 | artifacts/api-server/src/lib/gallery/providers/digitalnz.ts |
| 2 | artifacts/api-server/src/lib/gallery/providers/dpla.ts |
| 2 | artifacts/api-server/src/lib/gallery/providers/dryad.ts |
| 102 | artifacts/api-server/src/lib/gallery/providers/eporner.ts |
| 2 | artifacts/api-server/src/lib/gallery/providers/esa.ts |
| 46 | artifacts/api-server/src/lib/gallery/providers/europeana.ts |
| 2 | artifacts/api-server/src/lib/gallery/providers/figshare.ts |
| 2 | artifacts/api-server/src/lib/gallery/providers/fishbase.ts |
| 86 | artifacts/api-server/src/lib/gallery/providers/flickr.ts |
| 44 | artifacts/api-server/src/lib/gallery/providers/gbif.ts |
| 2 | artifacts/api-server/src/lib/gallery/providers/geograph.ts |
| 2 | artifacts/api-server/src/lib/gallery/providers/getty.ts |
| 2 | artifacts/api-server/src/lib/gallery/providers/google-arts-culture.ts |
| 122 | artifacts/api-server/src/lib/gallery/providers/google.ts |
| 2 | artifacts/api-server/src/lib/gallery/providers/harvard-art-museums.ts |
| 2 | artifacts/api-server/src/lib/gallery/providers/idigbio.ts |
| 50 | artifacts/api-server/src/lib/gallery/providers/inaturalist.ts |
| 146 | artifacts/api-server/src/lib/gallery/providers/index.ts |
| 61 | artifacts/api-server/src/lib/gallery/providers/internet-archive.ts |
| 2 | artifacts/api-server/src/lib/gallery/providers/jpl.ts |
| 44 | artifacts/api-server/src/lib/gallery/providers/loc.ts |
| 2 | artifacts/api-server/src/lib/gallery/providers/medlineplus.ts |
| 46 | artifacts/api-server/src/lib/gallery/providers/met.ts |
| 2 | artifacts/api-server/src/lib/gallery/providers/morphosource.ts |
| 2 | artifacts/api-server/src/lib/gallery/providers/nasa-earthdata.ts |
| 45 | artifacts/api-server/src/lib/gallery/providers/nasa.ts |
| 2 | artifacts/api-server/src/lib/gallery/providers/national-archives.ts |
| 2 | artifacts/api-server/src/lib/gallery/providers/national-science-foundation.ts |
| 2 | artifacts/api-server/src/lib/gallery/providers/nlm-digital-collections.ts |
| 2 | artifacts/api-server/src/lib/gallery/providers/noaa-photo-library.ts |
| 2 | artifacts/api-server/src/lib/gallery/providers/noaa.ts |
| 2 | artifacts/api-server/src/lib/gallery/providers/nypl.ts |
| 44 | artifacts/api-server/src/lib/gallery/providers/open-i.ts |
| 2 | artifacts/api-server/src/lib/gallery/providers/openalex.ts |
| 44 | artifacts/api-server/src/lib/gallery/providers/openverse.ts |
| 2 | artifacts/api-server/src/lib/gallery/providers/pexels.ts |
| 2 | artifacts/api-server/src/lib/gallery/providers/pixabay.ts |
| 2 | artifacts/api-server/src/lib/gallery/providers/planetary-data-system.ts |
| 2 | artifacts/api-server/src/lib/gallery/providers/plantnet.ts |
| 53 | artifacts/api-server/src/lib/gallery/providers/pubchem.ts |
| 57 | artifacts/api-server/src/lib/gallery/providers/rcsb-pdb.ts |
| 96 | artifacts/api-server/src/lib/gallery/providers/reddit.ts |
| 2 | artifacts/api-server/src/lib/gallery/providers/researchgate.ts |
| 47 | artifacts/api-server/src/lib/gallery/providers/rijksmuseum.ts |
| 48 | artifacts/api-server/src/lib/gallery/providers/smithsonian.ts |
| 2 | artifacts/api-server/src/lib/gallery/providers/tate.ts |
| 2 | artifacts/api-server/src/lib/gallery/providers/trove.ts |
| 47 | artifacts/api-server/src/lib/gallery/providers/unsplash.ts |
| 2 | artifacts/api-server/src/lib/gallery/providers/us-national-archives.ts |
| 2 | artifacts/api-server/src/lib/gallery/providers/usgs-eros.ts |
| 44 | artifacts/api-server/src/lib/gallery/providers/usgs-landsat.ts |
| 46 | artifacts/api-server/src/lib/gallery/providers/vam.ts |
| 47 | artifacts/api-server/src/lib/gallery/providers/wellcome.ts |
| 58 | artifacts/api-server/src/lib/gallery/providers/wikimedia.ts |
| 2 | artifacts/api-server/src/lib/gallery/providers/world-digital-library.ts |
| 2 | artifacts/api-server/src/lib/gallery/providers/zenodo.ts |
| 386 | artifacts/api-server/src/lib/gallery/search.ts |
| 270 | artifacts/api-server/src/lib/gallery/shared.ts |
| 141 | artifacts/api-server/src/lib/gallery/types.ts |
| 120 | artifacts/api-server/src/lib/groq.ts |
| 32 | artifacts/api-server/src/lib/jwt.ts |
| 20 | artifacts/api-server/src/lib/logger.ts |
| 0 | artifacts/api-server/src/middlewares/.gitkeep |
| 330 | artifacts/api-server/src/routes/ai-summary.ts |
| 151 | artifacts/api-server/src/routes/astronomy.ts |
| 179 | artifacts/api-server/src/routes/auth.ts |
| 698 | artifacts/api-server/src/routes/biology.ts |
| 200 | artifacts/api-server/src/routes/chat.ts |
| 23 | artifacts/api-server/src/routes/cosmic.ts |
| 649 | artifacts/api-server/src/routes/discovery.ts |
| 38 | artifacts/api-server/src/routes/gallery.ts |
| 11 | artifacts/api-server/src/routes/health.ts |
| 207 | artifacts/api-server/src/routes/image-search.ts |
| 41 | artifacts/api-server/src/routes/index.ts |
| 183 | artifacts/api-server/src/routes/posts.ts |
| 257 | artifacts/api-server/src/routes/search.ts |
| 1,053 | artifacts/api-server/src/routes/singularity.ts |
| 261 | artifacts/api-server/src/routes/transcribe.ts |
| 168 | artifacts/api-server/src/routes/tts.ts |
| 636 | artifacts/api-server/src/routes/unified-search.ts |
| 389 | artifacts/api-server/src/routes/visual-references.ts |

## Video artifact

22 files / 1,491 LOC

| LOC | File |
|---:|---|
| 27 | artifacts/cosmos-video/index.html |
| 36 | artifacts/cosmos-video/package.json |
| 5 | artifacts/cosmos-video/src/App.tsx |
| 63 | artifacts/cosmos-video/src/components/video/VideoTemplate.tsx |
| 86 | artifacts/cosmos-video/src/components/video/video_scenes/Scene1.tsx |
| 104 | artifacts/cosmos-video/src/components/video/video_scenes/Scene2.tsx |
| 127 | artifacts/cosmos-video/src/components/video/video_scenes/Scene3.tsx |
| 122 | artifacts/cosmos-video/src/components/video/video_scenes/Scene4.tsx |
| 156 | artifacts/cosmos-video/src/components/video/video_scenes/Scene5.tsx |
| 21 | artifacts/cosmos-video/src/hooks/use-mobile.tsx |
| 69 | artifacts/cosmos-video/src/index.css |
| 7 | artifacts/cosmos-video/src/lib/utils.ts |
| 239 | artifacts/cosmos-video/src/lib/video/animations.ts |
| 114 | artifacts/cosmos-video/src/lib/video/hooks.ts |
| 23 | artifacts/cosmos-video/src/lib/video/index.ts |
| 7 | artifacts/cosmos-video/src/main.tsx |
| 17 | artifacts/cosmos-video/tsconfig.json |
| 85 | artifacts/cosmos-video/vite.config.ts |

## Mockup artifact

68 files / 6,697 LOC

| LOC | File |
|---:|---|
| 21 | artifacts/mockup-sandbox/components.json |
| 31 | artifacts/mockup-sandbox/index.html |
| 180 | artifacts/mockup-sandbox/mockupPreviewPlugin.ts |
| 74 | artifacts/mockup-sandbox/package.json |
| 146 | artifacts/mockup-sandbox/src/App.tsx |
| 55 | artifacts/mockup-sandbox/src/components/ui/accordion.tsx |
| 139 | artifacts/mockup-sandbox/src/components/ui/alert-dialog.tsx |
| 59 | artifacts/mockup-sandbox/src/components/ui/alert.tsx |
| 5 | artifacts/mockup-sandbox/src/components/ui/aspect-ratio.tsx |
| 50 | artifacts/mockup-sandbox/src/components/ui/avatar.tsx |
| 37 | artifacts/mockup-sandbox/src/components/ui/badge.tsx |
| 115 | artifacts/mockup-sandbox/src/components/ui/breadcrumb.tsx |
| 83 | artifacts/mockup-sandbox/src/components/ui/button-group.tsx |
| 58 | artifacts/mockup-sandbox/src/components/ui/button.tsx |
| 213 | artifacts/mockup-sandbox/src/components/ui/calendar.tsx |
| 76 | artifacts/mockup-sandbox/src/components/ui/card.tsx |
| 260 | artifacts/mockup-sandbox/src/components/ui/carousel.tsx |
| 365 | artifacts/mockup-sandbox/src/components/ui/chart.tsx |
| 28 | artifacts/mockup-sandbox/src/components/ui/checkbox.tsx |
| 11 | artifacts/mockup-sandbox/src/components/ui/collapsible.tsx |
| 153 | artifacts/mockup-sandbox/src/components/ui/command.tsx |
| 198 | artifacts/mockup-sandbox/src/components/ui/context-menu.tsx |
| 120 | artifacts/mockup-sandbox/src/components/ui/dialog.tsx |
| 116 | artifacts/mockup-sandbox/src/components/ui/drawer.tsx |
| 201 | artifacts/mockup-sandbox/src/components/ui/dropdown-menu.tsx |
| 104 | artifacts/mockup-sandbox/src/components/ui/empty.tsx |
| 244 | artifacts/mockup-sandbox/src/components/ui/field.tsx |
| 176 | artifacts/mockup-sandbox/src/components/ui/form.tsx |
| 27 | artifacts/mockup-sandbox/src/components/ui/hover-card.tsx |
| 165 | artifacts/mockup-sandbox/src/components/ui/input-group.tsx |
| 69 | artifacts/mockup-sandbox/src/components/ui/input-otp.tsx |
| 22 | artifacts/mockup-sandbox/src/components/ui/input.tsx |
| 193 | artifacts/mockup-sandbox/src/components/ui/item.tsx |
| 28 | artifacts/mockup-sandbox/src/components/ui/kbd.tsx |
| 26 | artifacts/mockup-sandbox/src/components/ui/label.tsx |
| 254 | artifacts/mockup-sandbox/src/components/ui/menubar.tsx |
| 128 | artifacts/mockup-sandbox/src/components/ui/navigation-menu.tsx |
| 117 | artifacts/mockup-sandbox/src/components/ui/pagination.tsx |
| 31 | artifacts/mockup-sandbox/src/components/ui/popover.tsx |
| 28 | artifacts/mockup-sandbox/src/components/ui/progress.tsx |
| 42 | artifacts/mockup-sandbox/src/components/ui/radio-group.tsx |
| 45 | artifacts/mockup-sandbox/src/components/ui/resizable.tsx |
| 46 | artifacts/mockup-sandbox/src/components/ui/scroll-area.tsx |
| 159 | artifacts/mockup-sandbox/src/components/ui/select.tsx |
| 29 | artifacts/mockup-sandbox/src/components/ui/separator.tsx |
| 140 | artifacts/mockup-sandbox/src/components/ui/sheet.tsx |
| 714 | artifacts/mockup-sandbox/src/components/ui/sidebar.tsx |
| 15 | artifacts/mockup-sandbox/src/components/ui/skeleton.tsx |
| 26 | artifacts/mockup-sandbox/src/components/ui/slider.tsx |
| 31 | artifacts/mockup-sandbox/src/components/ui/sonner.tsx |
| 16 | artifacts/mockup-sandbox/src/components/ui/spinner.tsx |
| 27 | artifacts/mockup-sandbox/src/components/ui/switch.tsx |
| 120 | artifacts/mockup-sandbox/src/components/ui/table.tsx |
| 53 | artifacts/mockup-sandbox/src/components/ui/tabs.tsx |
| 22 | artifacts/mockup-sandbox/src/components/ui/textarea.tsx |
| 127 | artifacts/mockup-sandbox/src/components/ui/toast.tsx |
| 33 | artifacts/mockup-sandbox/src/components/ui/toaster.tsx |
| 61 | artifacts/mockup-sandbox/src/components/ui/toggle-group.tsx |
| 43 | artifacts/mockup-sandbox/src/components/ui/toggle.tsx |
| 32 | artifacts/mockup-sandbox/src/components/ui/tooltip.tsx |
| 19 | artifacts/mockup-sandbox/src/hooks/use-mobile.tsx |
| 189 | artifacts/mockup-sandbox/src/hooks/use-toast.ts |
| 185 | artifacts/mockup-sandbox/src/index.css |
| 6 | artifacts/mockup-sandbox/src/lib/utils.ts |
| 5 | artifacts/mockup-sandbox/src/main.tsx |
| 18 | artifacts/mockup-sandbox/tsconfig.json |
| 71 | artifacts/mockup-sandbox/vite.config.ts |

## Standalone Cosmic Run

3 files / 2,886 LOC

| LOC | File |
|---:|---|
| 0 | cosmic-run/README.md |
| 2,748 | cosmic-run/cosmic-run.js |
| 138 | cosmic-run/index.html |

## Shared libraries/API contracts

15 files / 1,317 LOC

| LOC | File |
|---:|---|
| 15 | lib/api-client-react/package.json |
| 371 | lib/api-client-react/src/custom-fetch.ts |
| 6 | lib/api-client-react/src/index.ts |
| 12 | lib/api-client-react/tsconfig.json |
| 716 | lib/api-spec/openapi.yaml |
| 72 | lib/api-spec/orval.config.ts |
| 11 | lib/api-spec/package.json |
| 12 | lib/api-zod/package.json |
| 4 | lib/api-zod/src/index.ts |
| 11 | lib/api-zod/tsconfig.json |
| 14 | lib/db/drizzle.config.ts |
| 25 | lib/db/package.json |
| 16 | lib/db/src/index.ts |
| 20 | lib/db/src/schema/index.ts |
| 12 | lib/db/tsconfig.json |

## Workspace scripts

5 files / 245 LOC

| LOC | File |
|---:|---|
| 217 | scripts/fix-aggregator.mjs |
| 14 | scripts/package.json |
| 4 | scripts/post-merge.sh |
| 1 | scripts/src/hello.ts |
| 9 | scripts/tsconfig.json |
