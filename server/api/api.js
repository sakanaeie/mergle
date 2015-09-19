function doGet(e) {
  return MyUtil.responseJsonp(e.parameters.callback, new Schedule().getStatus());
}
