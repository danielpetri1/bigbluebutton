package org.bigbluebutton.core.apps.breakout

import org.bigbluebutton.common2.msgs._
import org.bigbluebutton.core.apps.presentationpod.PresentationPodsApp
import org.bigbluebutton.core.apps.{ BreakoutModel, PermissionCheck, RightsManagementTrait }
import org.bigbluebutton.core.domain.{ BreakoutRoom2x, MeetingState2x }
import org.bigbluebutton.core.models.PresentationInPod
import org.bigbluebutton.core.running.{ LiveMeeting, OutMsgRouter }
import org.bigbluebutton.core.running.MeetingActor

trait CreateBreakoutRoomsCmdMsgHdlr extends RightsManagementTrait {
  this: MeetingActor =>

  val liveMeeting: LiveMeeting
  val outGW: OutMsgRouter

  def handleCreateBreakoutRoomsCmdMsg(msg: CreateBreakoutRoomsCmdMsg, state: MeetingState2x): MeetingState2x = {

    if (permissionFailed(PermissionCheck.MOD_LEVEL, PermissionCheck.VIEWER_LEVEL, liveMeeting.users2x, msg.header.userId) || liveMeeting.props.meetingProp.isBreakout) {
      val meetingId = liveMeeting.props.meetingProp.intId
      val reason = "No permission to create breakout room for meeting."
      PermissionCheck.ejectUserForFailedPermission(meetingId, msg.header.userId,
        reason, outGW, liveMeeting)
      state
    } else {
      state.breakout match {
        case Some(breakout) =>
          log.warning(
            "CreateBreakoutRooms event received while breakout created for meeting {}", liveMeeting.props.meetingProp.intId
          )
          state
        case None =>
          processRequest(msg, state)
      }
    }
  }

  def processRequest(msg: CreateBreakoutRoomsCmdMsg, state: MeetingState2x): MeetingState2x = {

    val presId = getPresentationId(state)
    val presSlide = getPresentationSlide(state)
    val parentId = liveMeeting.props.meetingProp.intId
    var rooms = new collection.immutable.HashMap[String, BreakoutRoom2x]

    var i = 0
    for (room <- msg.body.rooms) {
      i += 1
      val (internalId, externalId) = BreakoutRoomsUtil.createMeetingIds(liveMeeting.props.meetingProp.intId, i)
      val voiceConf = BreakoutRoomsUtil.createVoiceConfId(liveMeeting.props.voiceProp.voiceConf, i)

      val breakout = BreakoutModel.create(parentId, internalId, externalId, room.name, room.sequence, room.shortName, room.isDefaultName, room.freeJoin, voiceConf, room.users)
      rooms = rooms + (breakout.id -> breakout)
    }

    // Generate token if breakout room is recorded
    val presentationUploadToken = if (msg.body.record) (PresentationPodsApp.generateToken("DEFAULT_PRESENTATION_POD", msg.header.userId)) else null

    println("============================")
    println("")
    println("")
    println("")

    println(presentationUploadToken)
    println("")
    println("")
    println("")
    println("============================")

    for (breakout <- rooms.values.toVector) {
      val roomDetail = new BreakoutRoomDetail(
        breakout.id, breakout.name,
        liveMeeting.props.meetingProp.intId,
        breakout.sequence,
        breakout.shortName,
        breakout.isDefaultName,
        breakout.freeJoin,
        liveMeeting.props.voiceProp.dialNumber,
        breakout.voiceConf,
        msg.body.durationInMinutes,
        liveMeeting.props.password.moderatorPass,
        liveMeeting.props.password.viewerPass,
        presId, presSlide, msg.body.record,
        liveMeeting.props.breakoutProps.privateChatEnabled,
        // Add generated presentationUploadToken
        presentationUploadToken
      )

      val event = buildCreateBreakoutRoomSysCmdMsg(liveMeeting.props.meetingProp.intId, roomDetail)
      outGW.send(event) // Send message to bbb-web

      // Informs bbb-web about the token so that when we use it to upload the presentation, it is able to look it up in the list of tokens
      if (msg.body.record) {
        outGW.send(buildPresentationUploadTokenSysPubMsg(parentId, msg.header.userId, presentationUploadToken, breakout.name))
      }
    }

    val breakoutModel = new BreakoutModel(None, msg.body.durationInMinutes, rooms)
    state.update(Some(breakoutModel))
  }

  def buildPresentationUploadTokenSysPubMsg(parentId: String, userId: String, presentationUploadToken: String, filename: String): BbbCommonEnvCoreMsg = {
    val routing = collection.immutable.HashMap("sender" -> "bbb-apps-akka")
    val envelope = BbbCoreEnvelope(PresentationUploadTokenSysPubMsg.NAME, routing)
    val header = BbbClientMsgHeader(PresentationUploadTokenSysPubMsg.NAME, parentId, userId)
    val body = PresentationUploadTokenSysPubMsgBody("DEFAULT_PRESENTATION_POD", presentationUploadToken, filename, parentId)
    val event = PresentationUploadTokenSysPubMsg(header, body)
    BbbCommonEnvCoreMsg(envelope, event)
  }

  def buildCreateBreakoutRoomSysCmdMsg(meetingId: String, breakout: BreakoutRoomDetail): BbbCommonEnvCoreMsg = {
    val routing = collection.immutable.HashMap("sender" -> "bbb-apps-akka")
    val envelope = BbbCoreEnvelope(CreateBreakoutRoomSysCmdMsg.NAME, routing)
    val header = BbbCoreBaseHeader(CreateBreakoutRoomSysCmdMsg.NAME)

    val body = CreateBreakoutRoomSysCmdMsgBody(meetingId, breakout)
    val event = CreateBreakoutRoomSysCmdMsg(header, body)
    BbbCommonEnvCoreMsg(envelope, event)
  }

  def getPresentationId(state: MeetingState2x): String = {
    // in very rare cases the presentation conversion generates an error, what should we do?
    // those cases where default.pdf is deleted from the whiteboard
    var currentPresentation = "blank"
    for {
      defaultPod <- state.presentationPodManager.getDefaultPod()
      curPres <- defaultPod.getCurrentPresentation()
    } yield {
      currentPresentation = curPres.id
    }

    currentPresentation
  }

  def getPresentationSlide(state: MeetingState2x): Int = {
    if (!liveMeeting.presModel.getCurrentPage().isEmpty) liveMeeting.presModel.getCurrentPage().get.num else 0
    var currentSlide = 0
    for {
      defaultPod <- state.presentationPodManager.getDefaultPod()
      curPres <- defaultPod.getCurrentPresentation()
      curPage <- PresentationInPod.getCurrentPage(curPres)
    } yield {
      currentSlide = curPage.num
    }

    currentSlide
  }
}
